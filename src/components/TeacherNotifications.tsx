
"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";

interface Notification {
  id: number;
  title: string;
  description: string;
  date: Date;
  isRead: boolean;
}

const TeacherNotifications = () => {
  const { user } = useUser();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchNotifications();
    }
  }, [user]);

  const fetchNotifications = async () => {
    try {
      const response = await fetch("/api/teacher-notifications");
      if (response.ok) {
        const data = await response.json();
        setNotifications(data);
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: number) => {
    try {
      await fetch(`/api/teacher-notifications/${notificationId}`, {
        method: "PATCH",
      });
      setNotifications(prev =>
        prev.map(notif =>
          notif.id === notificationId ? { ...notif, isRead: true } : notif
        )
      );
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  if (loading) {
    return <div className="text-gray-500">Loading notifications...</div>;
  }

  const unreadNotifications = notifications.filter(n => !n.isRead);
  const recentNotifications = notifications.slice(0, 5);

  return (
    <div className="bg-white p-4 rounded-lg shadow">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Recent Notifications</h2>
        {unreadNotifications.length > 0 && (
          <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
            {unreadNotifications.length} new
          </span>
        )}
      </div>

      {notifications.length === 0 ? (
        <p className="text-gray-500 text-sm">No notifications</p>
      ) : (
        <div className="space-y-3">
          {recentNotifications.map((notification) => (
            <div
              key={notification.id}
              className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                !notification.isRead
                  ? "bg-blue-50 border-blue-200"
                  : "bg-gray-50 border-gray-200"
              }`}
              onClick={() => !notification.isRead && markAsRead(notification.id)}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="font-medium text-sm">{notification.title}</h3>
                  <p className="text-gray-600 text-xs mt-1">
                    {notification.description}
                  </p>
                  <p className="text-gray-400 text-xs mt-2">
                    {new Date(notification.date).toLocaleString()}
                  </p>
                </div>
                {!notification.isRead && (
                  <div className="w-2 h-2 bg-blue-500 rounded-full ml-2 mt-1"></div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {notifications.length > 5 && (
        <div className="mt-3 text-center">
          <button className="text-blue-500 text-sm hover:underline">
            View all notifications
          </button>
        </div>
      )}
    </div>
  );
};

export default TeacherNotifications;
