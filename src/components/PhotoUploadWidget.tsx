"use client";

import { CldUploadWidget } from "next-cloudinary";
import Image from "next/image";
import { useState } from "react";
import { toast } from "react-toastify";
import { handlePhotoUpload } from "@/lib/actions";
import { useActionState } from "react";

interface PhotoUploadWidgetProps {
  currentUserId?: string;
  userRole?: string;
  onPhotoUploaded?: (url: string) => void;
  className?: string;
}

const PhotoUploadWidget = ({ 
  currentUserId, 
  userRole, 
  onPhotoUploaded,
  className = "text-xs text-gray-500 flex items-center gap-2 cursor-pointer"
}: PhotoUploadWidgetProps) => {
  const [uploading, setUploading] = useState(false);
  
  const [state, formAction] = useActionState(handlePhotoUpload, {
    success: false,
    error: "",
    message: "",
  });

  const handleUploadSuccess = async (result: any, { widget }: any) => {
    widget.close();
    setUploading(true);

    try {
      if (currentUserId && userRole) {
        // For current user - sync to both database and Clerk
        const formData = new FormData();
        formData.append("photoUrl", result.info.secure_url);
        formData.append("userId", currentUserId);
        formData.append("userRole", userRole);
        
        await formAction(formData);
        
        if (state.success) {
          toast.success("Photo updated successfully!");
        } else {
          toast.error("Failed to update photo");
        }
      } else {
        // For form uploads - just pass the URL
        toast.success("Photo uploaded successfully!");
      }
      
      onPhotoUploaded?.(result.info.secure_url);
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload photo");
    } finally {
      setUploading(false);
    }
  };

  return (
    <CldUploadWidget
      uploadPreset="school"
      onSuccess={handleUploadSuccess}
    >
      {({ open }) => (
        <div className={className} onClick={() => open()}>
          <Image src="/upload.png" alt="Upload" width={28} height={28} />
          <span>{uploading ? "Uploading..." : "Upload a photo"}</span>
        </div>
      )}
    </CldUploadWidget>
  );
};

export default PhotoUploadWidget;
