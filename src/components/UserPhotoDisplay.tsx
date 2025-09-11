"use client";

import { useUser } from '@clerk/nextjs';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import PhotoUploadWidget from "./PhotoUploadWidget";
import PhotoDeleteButton from "./PhotoDeleteButton";

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
  const { user } = useUser();
  const [photoUrl, setPhotoUrl] = useState(currentPhotoUrl);
  const [userInfo, setUserInfo] = useState({ name: userName, email: userEmail });

  // Update photo URL when prop changes (after page refresh)
  useEffect(() => {
    setPhotoUrl(currentPhotoUrl);
  }, [currentPhotoUrl]);

  // Update photo and info if this is the current user and they've updated their profile
  useEffect(() => {
    if (user && user.id === userId) {
      // Use the latest image from Clerk
      const latestImage = user.imageUrl;
      if (latestImage !== photoUrl) {
        setPhotoUrl(latestImage);
      }

      // Update name and email from Clerk
      const latestName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
      const latestEmail = user.emailAddresses?.[0]?.emailAddress || null;
      
      if (latestName !== userInfo.name || latestEmail !== userInfo.email) {
        setUserInfo({ name: latestName, email: latestEmail });
        
        // Sync to database
        syncProfileToDatabase(userId, user);
      }
    }
  }, [user, userId, photoUrl, userInfo.name, userInfo.email]);

  const syncProfileToDatabase = async (userId: string, clerkUser: any) => {
    try {
      await fetch('/api/sync-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          userData: {
            name: clerkUser.firstName || '',
            surname: clerkUser.lastName || '',
            email: clerkUser.emailAddresses?.[0]?.emailAddress || '',
            phone: clerkUser.phoneNumbers?.[0]?.phoneNumber || '',
            img: clerkUser.imageUrl || null,
          },
          role: userRole,
        }),
      });
    } catch (error) {
      console.error('Error syncing profile:', error);
    }
  };

  const sizeClasses = {
    small: "w-10 h-10",
    medium: "w-16 h-16",
    large: "w-36 h-36",
  };

  const handlePhotoUpdate = (newUrl: string | null | undefined) => {
    console.log("=== Photo Update Debug ===");
    console.log("Current photo URL:", photoUrl);
    console.log("New photo URL:", newUrl);
    console.log("User:", userName);
    console.log("User ID:", userId);
    
    setPhotoUrl(newUrl || null);
  };

  const handlePhotoDeleted = () => {
    setPhotoUrl(null);
  };

  console.log("UserPhotoDisplay render:", {
    currentPhotoUrl,
    photoUrl,
    userName,
    userId,
    userRole
  });

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
          key={photoUrl} // Force re-render when photo changes
        />
        {canEdit && (
          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 rounded-full flex items-center justify-center transition-all duration-200">
            <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center gap-2">
              <PhotoUploadWidget
                currentUserId={userId}
                userRole={userRole}
                onPhotoUploaded={handlePhotoUpdate}
                className="text-white text-xs flex items-center justify-center p-2 rounded-full hover:bg-white hover:bg-opacity-20"
              />
              {photoUrl && (
                <PhotoDeleteButton
                  userId={userId}
                  userRole={userRole}
                  onPhotoDeleted={handlePhotoDeleted}
                  className="text-white text-xs flex items-center justify-center p-2 rounded-full hover:bg-white hover:bg-opacity-20"
                />
              )}
            </div>
          </div>
        )}
      </div>
      {showInfo && (
        <div className="flex flex-col">
          <h3 className="font-semibold">{userInfo.name}</h3>
          {userInfo.email && <p className="text-xs text-gray-500">{userInfo.email}</p>}
        </div>
      )}
    </div>
  );
};

export default UserPhotoDisplay;
