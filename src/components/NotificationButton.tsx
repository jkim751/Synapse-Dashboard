"use client";

import Image from "next/image";
import { useNotifications } from "./NotificationContext";
import { useState, useEffect } from "react";

const NotificationButton = () => {
  const { notifications, unreadCount, markAsRead, refreshNotifications, clearAllNotifications, isClearing } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);

  // Auto-refresh notifications every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      refreshNotifications();
    }, 30000);

    return () => clearInterval(interval);
  }, [refreshNotifications]);

  const handleNotificationClick = (id: string) => {
    markAsRead(id);
  };

  const handleClearAll = async (mode: "delete" | "read" = "delete") => {
    try {
      await clearAllNotifications(mode);
      console.log(`Notifications ${mode === "delete" ? "deleted" : "marked as read"} successfully`);
    } catch (error) {
      console.error("Failed to clear notifications:", error);
    }
  };

  return (
    <div className="relative">
      <div 
        className="bg-white rounded-full w-7 h-7 flex items-center justify-center cursor-pointer relative"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Image src="/announcement.png" alt="" width={20} height={20} />
        {unreadCount > 0 && (
          <div className="absolute -top-3 -right-3 w-5 h-5 flex items-center justify-center bg-purple-500 text-white rounded-full text-xs">
            {unreadCount}
          </div>
        )}
      </div>
      
      {isOpen && (
        <div className="absolute right-0 top-8 w-80 bg-white rounded-xl shadow-lg border border-gray-200 z-50 max-h-96 overflow-y-auto">
          <div className="p-3 border-b border-gray-200">
            <h3 className="font-semibold text-gray-800">Notifications</h3>
            <div className="flex items-center gap-2">
              <button
                className="text-xs px-2 py-1 rounded bg-gray-100 hover:bg-gray-200 disabled:opacity-50"
                disabled={isClearing || notifications.length === 0}
                onClick={() => handleClearAll("read")}
                title="Mark all as read"
              >
                {isClearing ? "Clearing…" : "Mark all read"}
              </button>
              <button
                className="text-xs px-2 py-1 rounded bg-red-100 hover:bg-red-200 disabled:opacity-50"
                disabled={isClearing || notifications.length === 0}
                onClick={() => handleClearAll("delete")}
                title="Delete all"
              >
                {isClearing ? "Clearing…" : "Delete all"}
              </button>
            </div>
          </div>
          {notifications.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              No notifications
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {notifications.slice(0, 10).map((notification) => (
                <div
                  key={notification.id}
                  className={`p-3 cursor-pointer hover:bg-gray-50 ${
                    !notification.read ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                  }`}
                  onClick={ async () => {
                    const next = !isOpen;
                    setIsOpen(next);
                    if (next) await refreshNotifications();
                    handleNotificationClick(notification.id)}}
                >
                  <div className="font-medium text-sm text-gray-800">
                    {notification.title}
                  </div>
                  <div className="text-xs text-gray-600 mt-1">
                    {notification.message}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    {notification.timestamp.toLocaleTimeString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationButton;
