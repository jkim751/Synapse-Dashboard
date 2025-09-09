"use client";

import { CldUploadWidget } from "next-cloudinary";
import Image from "next/image";
import { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { handlePhotoUpload } from "@/lib/actions";
import { useActionState } from "react";
import { useRouter } from "next/navigation";

interface PhotoUploadWidgetProps {
  currentUserId?: string;
  userRole?: string;
  onPhotoUploaded?: (url: string) => void;
  className?: string;
  disabled?: boolean;
}

const PhotoUploadWidget = ({ 
  currentUserId, 
  userRole, 
  onPhotoUploaded,
  className = "text-xs text-gray-500 flex items-center gap-2 cursor-pointer",
  disabled = false
}: PhotoUploadWidgetProps) => {
  const [uploading, setUploading] = useState(false);
  const router = useRouter();
  
  const [state, formAction] = useActionState(handlePhotoUpload, {
    success: false,
    error: "",
    message: "",
  });

  // Handle server action response
  useEffect(() => {
    if (state.success && state.message) {
      toast.success(state.message);
    } else if (state.error) {
      toast.error(state.error);
    }
  }, [state]);

  const handleUploadSuccess = async (result: any, { widget }: any) => {
    widget.close();
    
    if (!result?.info?.secure_url) {
      toast.error("Upload failed - no URL received");
      return;
    }

    setUploading(true);

    try {
      if (currentUserId && userRole) {
        // Optimistically update the UI
        onPhotoUploaded?.(result.info.secure_url);
        
        // For current user - sync to both database and Clerk
        const formData = new FormData();
        formData.append("photoUrl", result.info.secure_url);
        formData.append("userId", currentUserId);
        formData.append("userRole", userRole);
        
        // Execute the server action
        await formAction(formData);
        
        // Refresh the page to show updated data
        router.refresh();
      } else {
        // For form uploads - just pass the URL
        toast.success("Photo uploaded successfully!");
        onPhotoUploaded?.(result.info.secure_url);
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload photo");
    } finally {
      setUploading(false);
    }
  };

  const handleUploadError = (error: any) => {
    console.error("Cloudinary upload error:", error);
    toast.error("Failed to upload to cloud storage");
    setUploading(false);
  };

  return (
    <CldUploadWidget
      uploadPreset="school"
      onSuccess={handleUploadSuccess}
      onError={handleUploadError}
      options={{
        maxFileSize: 10000000, // 10MB
        resourceType: "image",
        clientAllowedFormats: ["png", "jpg", "jpeg", "gif", "webp"],
      }}
    >
      {({ open }) => (
        <div 
          className={`${className} ${disabled || uploading ? 'opacity-50 cursor-not-allowed' : ''}`} 
          onClick={() => {
            if (!disabled && !uploading) {
              open();
            }
          }}
        >
          <Image 
            src="/upload.png" 
            alt="Upload" 
            width={20} 
            height={20} 
            className="filter brightness-0 invert"
          />
        </div>
      )}
    </CldUploadWidget>
  );
};

export default PhotoUploadWidget;
