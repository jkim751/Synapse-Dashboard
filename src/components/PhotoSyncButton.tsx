"use client";

import { useState } from "react";
import Image from "next/image";
import { toast } from "react-toastify";

interface PhotoSyncButtonProps {
  userPhoto: string | null;
  clerkPhoto: string | null;
  userId: string;
  userRole: string;
}

const PhotoSyncButton = ({ userPhoto, clerkPhoto, userId, userRole }: PhotoSyncButtonProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [currentPhoto, setCurrentPhoto] = useState(userPhoto);

  const syncPhotoFromClerk = async () => {
    if (!clerkPhoto) {
      toast.error("No Clerk photo to sync");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/sync-photo", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          userRole,
          photoUrl: clerkPhoto,
        }),
      });

      if (response.ok) {
        setCurrentPhoto(clerkPhoto);
        toast.success("Photo synced successfully!");
        window.location.reload(); // Refresh to update the navbar
      } else {
        toast.error("Failed to sync photo");
      }
    } catch (error) {
      toast.error("Error syncing photo");
    } finally {
      setIsLoading(false);
    }
  };

  // Show sync button only if there's a Clerk photo and it's different from DB photo
  if (!clerkPhoto || currentPhoto === clerkPhoto) {
    return null;
  }

  return (
    <button
      onClick={syncPhotoFromClerk}
      disabled={isLoading}
      className="absolute -top-1 -right-1 bg-blue-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs hover:bg-blue-600 transition-colors"
      title="Sync photo from Clerk profile"
    >
      {isLoading ? "..." : "↻"}
    </button>
  );
};

export default PhotoSyncButton;
