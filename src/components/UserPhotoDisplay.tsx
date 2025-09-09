"use client";

import Image from "next/image";
import { useState } from "react";
import PhotoUploadWidget from "./PhotoUploadWidget";

interface UserPhotoDisplayProps {
  currentPhotoUrl?: string | null;
  userId: string;
  userRole: string;
  userName: string;
  userEmail?: string | null;
  size?: "small" | "medium" | "large";
  canEdit?: boolean;
  showInfo?: boolean;
}

const UserPhotoDisplay = ({
  currentPhotoUrl,
  userId,
  userRole,
  userName,
  userEmail,
  size = "small",
  canEdit = false,
  showInfo = true,
}: UserPhotoDisplayProps) => {
  const [photoUrl, setPhotoUrl] = useState(currentPhotoUrl);

  const sizeClasses = {
    small: "w-10 h-10",
    medium: "w-16 h-16",
    large: "w-36 h-36",
  };

  const handlePhotoUpdate = (newUrl: string) => {
    setPhotoUrl(newUrl);
  };

  return (
    <div className="flex items-center gap-4">
      <div className="relative group">
        <Image
          src={photoUrl || "/noAvatar.png"}
          alt={userName}
          width={size === "large" ? 144 : size === "medium" ? 64 : 40}
          height={size === "large" ? 144 : size === "medium" ? 64 : 40}
          className={`${sizeClasses[size]} rounded-full object-cover ${
            size === "small" ? "md:hidden xl:block" : ""
          }`}
        />
        {canEdit && (
          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 rounded-full flex items-center justify-center transition-all duration-200">
            <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <PhotoUploadWidget
                currentUserId={userId}
                userRole={userRole}
                onPhotoUploaded={handlePhotoUpdate}
                className="text-white text-xs flex items-center justify-center"
              />
            </div>
          </div>
        )}
      </div>
      {showInfo && (
        <div className="flex flex-col">
          <h3 className="font-semibold">{userName}</h3>
          {userEmail && <p className="text-xs text-gray-500">{userEmail}</p>}
        </div>
      )}
    </div>
  );
};

export default UserPhotoDisplay;
