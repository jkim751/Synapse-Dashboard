"use client";

import { useEffect, useState } from "react";

type Announcement = {
  id: number;
  title: string;
  date: Date | string;
  description: string;
};

const AnnouncementsClient = ({ announcements, userId }: { announcements: Announcement[]; userId: string }) => {
  const storageKey = `dismissed_announcements_${userId}`;
  const [dismissed, setDismissed] = useState<number[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      try {
        setDismissed(JSON.parse(stored));
      } catch {
        // ignore malformed storage
      }
    }
    setMounted(true);
  }, []);

  const dismiss = (id: number) => {
    const updated = [...dismissed, id];
    setDismissed(updated);
    localStorage.setItem(storageKey, JSON.stringify(updated));
  };

  const visible = announcements.filter((a) => !dismissed.includes(a.id));

  // Avoid hydration mismatch — render all until mounted
  if (!mounted) {
    return (
      <div className="flex flex-col gap-4 mt-4">
        {announcements.map((announcement) => (
          <div key={announcement.id} className="bg-lamaSkyLight bg-opacity-10 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <h2 className="font-medium">{announcement.title}</h2>
              <span className="text-xs text-black rounded-xl px-1 py-1">
                {new Intl.DateTimeFormat("en-GB").format(new Date(announcement.date))}
              </span>
            </div>
            <p className="text-sm text-black mt-1">{announcement.description}</p>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 mt-4">
      {visible.length === 0 && (
        <p className="text-sm text-gray-500 mt-2">No announcements found.</p>
      )}
      {visible.map((announcement) => (
        <div key={announcement.id} className="relative bg-lamaSkyLight bg-opacity-10 rounded-xl p-4">
          <button
            onClick={() => dismiss(announcement.id)}
            className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 leading-none"
            aria-label="Dismiss announcement"
          >
            ×
          </button>
          <div className="flex items-center justify-between pr-4">
            <h2 className="font-medium">{announcement.title}</h2>
            <span className="text-xs text-black rounded-xl px-1 py-1">
              {new Intl.DateTimeFormat("en-GB").format(new Date(announcement.date))}
            </span>
          </div>
          <p className="text-sm text-black mt-1">{announcement.description}</p>
        </div>
      ))}
    </div>
  );
};

export default AnnouncementsClient;
