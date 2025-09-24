"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { toast } from "react-toastify";
import { deleteUserPhoto } from "@/lib/actions";

interface PhotoDeleteButtonProps {
  userId: string;
  userRole: string;
  onPhotoDeleted?: () => void;
  className?: string;
  disabled?: boolean;
}

const PhotoDeleteButton = ({
  userId,
  userRole,
  onPhotoDeleted,
  className = "text-red-500 hover:text-red-700",
  disabled = false
}: PhotoDeleteButtonProps) => {
  const [showConfirm, setShowConfirm] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    if (disabled || isPending) return;
    
    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.append("userId", userId);
        formData.append("userRole", userRole);
        
        const result = await deleteUserPhoto(
          { success: false, error: "", message: "" }, 
          formData
        );
        
        if (result.success) {
          toast.success(result.message || "Photo removed successfully!");
          onPhotoDeleted?.();
          // Small delay before refresh
          setTimeout(() => {
            window.location.reload();
          }, 500);
        } else {
          toast.error(result.error || "Failed to remove photo");
        }
      } catch (error) {
        console.error("Delete photo error:", error);
        toast.error("Failed to remove photo");
      } finally {
        setShowConfirm(false);
      }
    });
  };

  if (showConfirm) {
    return (
      <div className="flex items-center gap-2">
        <button
          onClick={handleDelete}
          disabled={isPending}
          className="text-xs bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600 disabled:opacity-50"
        >
          {isPending ? "Removing..." : "Confirm"}
        </button>
        <button
          onClick={() => setShowConfirm(false)}
          disabled={isPending}
          className="text-xs bg-gray-300 text-gray-700 px-2 py-1 rounded hover:bg-gray-400"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setShowConfirm(true)}
      disabled={disabled || isPending}
      className={`${className} ${disabled || isPending ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      title="Remove photo"
    >
      <Image 
        src="/delete.png" 
        alt="Remove photo" 
        width={16} 
        height={16} 
        className="filter brightness-0 invert"
      />
    </button>
  );
};

export default PhotoDeleteButton;
