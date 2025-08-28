"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo } from 'react';
import { useAuth } from '@clerk/nextjs';

interface Notification {
  id: string;
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  type?: string;
  lessonId?: number;
}

interface NotificationContextType {
  notifications: Notification[];
  addNotification: (
    title: string,
    message: string,
    opts?: { type?: string; lessonId?: number; recipientIds?: string[] }
  ) => void;
  markAsRead: (id: string) => void;
  unreadCount: number;
  refreshNotifications: () => void;
  clearAllNotifications: (mode?: "delete" | "read") => void;
  isClearing: boolean;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const { isSignedIn, userId } = useAuth();
  const [isClearing, setIsClearing] = useState(false);

  const fetchNotifications = useCallback(async () => {
    if (!isSignedIn || !userId) {
      console.log("User not signed in, skipping notification fetch");
      return;
    }

    try {
      console.log("Fetching notifications for user:", userId);
      const response = await fetch("/api/attendance/notifications");
      if (response.ok) {
        const data = await response.json();
        console.log("Fetched notifications:", data);
        const formattedNotifications = data.map((notif: any) => ({
          id: notif.id,
          title: notif.title,
          message: notif.message,
          timestamp: new Date(notif.createdAt),
          read: notif.isRead,
          type: notif.type,
          lessonId: notif.lessonId,
        }));
        setNotifications(formattedNotifications);
      } else {
        console.error("Failed to fetch notifications:", response.status, response.statusText);
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
    }
  }, [isSignedIn, userId]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const addNotification = async (
    title: string,
    message: string,
    opts?: { type?: string; lessonId?: number; recipientIds?: string[] } // adjust to your needs
  ) => {
    // optimistic local add (shows instantly)
    const tempId = `tmp-${Date.now()}`;
    const optimistic: Notification = {
      id: tempId,
      title,
      message,
      timestamp: new Date(),
      read: false,
      type: opts?.type,
      lessonId: opts?.lessonId,
    };
    setNotifications(prev => [optimistic, ...prev]);
  
    try {
      const res = await fetch("/api/attendance/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          message,
          type: opts?.type,
          lessonId: opts?.lessonId,
          recipientIds: opts?.recipientIds, // backend can default to current user or a class
        }),
      });
  
      if (!res.ok) throw new Error(`POST failed: ${res.status}`);
      const created = await res.json(); // expect the created notification(s)
      // replace optimistic with real (assumes single record returned)
      setNotifications(prev =>
        prev.map(n => (n.id === tempId ? {
          ...n,
          id: created.id,
          timestamp: new Date(created.createdAt),
        } : n))
      );
    } catch (e) {
      console.error("Failed to send notification:", e);
      // rollback optimistic on error
      setNotifications(prev => prev.filter(n => n.id !== tempId));
    }
  };

  const markAsRead = async (id: string) => {
    // optimistic
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  
    try {
      // Try body-based PATCH (your current approach)
      let res = await fetch("/api/attendance/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId: id }),
      });
  
      // If your API actually expects /notifications/:id, fall back gracefully
      if (!res.ok) {
        res = await fetch(`/api/attendance/notifications/${id}`, { method: "PATCH" });
        if (!res.ok) throw new Error(`PATCH failed: ${res.status}`);
      }
    } catch (e) {
      console.error("Error marking as read:", e);
      // rollback optimistic if server failed
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: false } : n));
    }
  };

  const refreshNotifications = () => {
    fetchNotifications();
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const clearAllNotifications = async (mode: "delete" | "read" = "delete") => {
    if (isClearing || notifications.length === 0) return;
    setIsClearing(true);

    // optimistic update
    const prev = notifications;
    if (mode === "delete") {
      setNotifications([]);
    } else {
      setNotifications(prev.map(n => ({ ...n, read: true })));
    }
    
    try {
      console.log(`Clearing notifications with mode: ${mode}`);
      const res = await fetch(`/api/attendance/notifications?mode=${mode}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        console.error("Failed to clear notifications:", res.status, res.statusText);
        throw new Error(`DELETE failed: ${res.status}`);
      }
      console.log("Notifications cleared successfully");
      
      // Refresh to get updated state from server
      await fetchNotifications();
    } catch (e) {
      console.error("Failed to clear notifications", e);
      // rollback on error
      setNotifications(prev);
    } finally {
      setIsClearing(false);
    }
  };

  const value = useMemo<NotificationContextType>(
    () => ({
      notifications,
      addNotification,
      markAsRead,
      unreadCount,
      refreshNotifications,
      clearAllNotifications,
      isClearing,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [notifications, isClearing, unreadCount]
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};
