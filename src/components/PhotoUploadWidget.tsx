"use client";

import { CldUploadWidget } from "next-cloudinary";
import Image from "next/image";
import { useState, useEffect, useTransition } from "react";
import { toast } from "react-toastify";
import { handlePhotoUpload } from "@/lib/actions";
import { useRouter } from "next/navigation";

interface PhotoUploadWidgetProps {
  currentUserId?: string;
  userRole?: string;
  onPhotoUploaded?: (url: string | null) => void;
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
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleUploadSuccess = async (result: any, { widget }: any) => {
    widget.close();
    
    if (!result?.info?.secure_url) {
      toast.error("Upload failed - no URL received");
      return;
    }

    const photoUrl = result.info.secure_url;
    console.log("Photo uploaded to Cloudinary:", photoUrl);
    
    setUploading(true);

    try {
      if (currentUserId && userRole) {
        // Optimistically update the UI first
        onPhotoUploaded?.(photoUrl);
        
        // Create FormData for the server action
        const formData = new FormData();
        formData.append("photoUrl", photoUrl);
        formData.append("userId", currentUserId);
        formData.append("userRole", userRole);
        
        console.log("Calling server action with:", { photoUrl, currentUserId, userRole });
        
        // Use startTransition to call the server action
        startTransition(async () => {
          try {
            const result = await handlePhotoUpload({ success: false, error: "", message: "" }, formData);
            console.log("Server action result:", result);
            
            if (result.success) {
              toast.success(result.message || "Photo updated successfully!");
              // Force a hard refresh to see the updated photo
              window.location.reload();
            } else {
              toast.error(result.error || "Failed to update photo");
              // Revert the optimistic update
              onPhotoUploaded?.(null);
            }
          } catch (error) {
            console.error("Server action error:", error);
            toast.error("Failed to update photo");
            // Revert the optimistic update
            onPhotoUploaded?.(null);
          }
        });
      } else {
        // For form uploads - just pass the URL
        toast.success("Photo uploaded successfully!");
        onPhotoUploaded?.(photoUrl);
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

  const isLoading = uploading || isPending;

  return (
    <CldUploadWidget
      uploadPreset="school"
      onSuccess={handleUploadSuccess}
      onError={handleUploadError}
      options={{
        maxFileSize: 10000000, // 10MB
        resourceType: "image",
        clientAllowedFormats: ["png", "jpg", "jpeg", "gif", "webp"],
        sources: ["local", "url", "camera"],
        multiple: false,
      }}
    >
      {({ open }) => (
        <div 
          className={`${className} ${disabled || isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:opacity-75'}`} 
          onClick={() => {
            if (!disabled && !isLoading) {
              open();
            }
          }}
          title={isLoading ? "Uploading..." : "Click to upload photo"}
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
