import { auth, clerkClient } from "@clerk/nextjs/server";

export interface PhotoUploadResult {
  cloudinaryUrl?: string;
  success: boolean;
  error?: string;
}

export const syncPhotoToClerk = async (
  photoUrl: string,
  userId?: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    if (!userId) {
      const { userId: currentUserId } = await auth();
      if (!currentUserId) {
        return { success: false, error: "No user authenticated" };
      }
      userId = currentUserId;
    }

    // For deleting photo (reverting to default)
    if (photoUrl === "/noAvatar.png") {
      await (await clerkClient()).users.deleteUserProfileImage(userId);
      return { success: true };
    }

    // For updating with new photo - convert URL to File
    const response = await fetch(photoUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const mimeType = response.headers.get('content-type') || 'image/jpeg';
    const filename = photoUrl.split('/').pop() || 'profile-image.jpg';
    
    // Create a File object from the array buffer
    const file = new File([arrayBuffer], filename, { type: mimeType });

    await (await clerkClient()).users.updateUserProfileImage(userId, {
      file: file,
    });

    return { success: true };
  } catch (error) {
    console.error("Failed to sync photo to Clerk:", error);
    return { success: false, error: `Failed to sync photo to Clerk: ${error}` };
  }
};

export const updateUserPhotoInDatabase = async (
  userId: string,
  userRole: string,
  photoUrl: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const { PrismaClient } = await import("@prisma/client");
    const prisma = new PrismaClient();

    switch (userRole.toLowerCase()) {
      case "teacher":
        await prisma.teacher.update({
          where: { id: userId },
          data: { img: photoUrl },
        });
        break;
      case "student":
        await prisma.student.update({
          where: { id: userId },
          data: { img: photoUrl },
        });
        break;
      case "admin":
        await prisma.admin.update({
          where: { id: userId },
          data: { img: photoUrl },
        });
        break;
      default:
        return { success: false, error: "Invalid user role" };
    }

    await prisma.$disconnect();
    return { success: true };
  } catch (error) {
    console.error("Failed to update photo in database:", error);
    return { success: false, error: "Failed to update photo in database" };
  }
};

export const deleteUserPhotoFromDatabase = async (
  userId: string,
  userRole: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const { PrismaClient } = await import("@prisma/client");
    const prisma = new PrismaClient();

    switch (userRole.toLowerCase()) {
      case "teacher":
        await prisma.teacher.update({
          where: { id: userId },
          data: { img: null },
        });
        break;
      case "student":
        await prisma.student.update({
          where: { id: userId },
          data: { img: null },
        });
        break;
      case "admin":
        await prisma.admin.update({
          where: { id: userId },
          data: { img: null },
        });
        break;
      default:
        return { success: false, error: "Invalid user role" };
    }

    await prisma.$disconnect();
    return { success: true };
  } catch (error) {
    console.error("Failed to delete photo from database:", error);
    return { success: false, error: "Failed to delete photo from database" };
  }
};

export const handlePhotoUpload = async (
  cloudinaryResult: any,
  userId: string,
  userRole: string
): Promise<PhotoUploadResult> => {
  try {
    const photoUrl = cloudinaryResult.secure_url;
    
    // Update database first
    const dbResult = await updateUserPhotoInDatabase(userId, userRole, photoUrl);
    if (!dbResult.success) {
      return { success: false, error: dbResult.error };
    }

    // Sync to Clerk - this is critical for the UserButton to show the image
    const clerkResult = await syncPhotoToClerk(photoUrl, userId);
    if (!clerkResult.success) {
      console.error("Database updated but Clerk sync failed:", clerkResult.error);
      // Don't fail the entire operation, but log the error
      return { 
        success: true, 
        cloudinaryUrl: photoUrl,
        error: `Photo saved but may not appear in navbar: ${clerkResult.error}`
      };
    }

    return { 
      success: true, 
      cloudinaryUrl: photoUrl 
    };
  } catch (error) {
    console.error("Photo upload failed:", error);
    return { success: false, error: "Photo upload failed" };
  }
};

export const handlePhotoDelete = async (
  userId: string,
  userRole: string
): Promise<PhotoUploadResult> => {
  try {
    // Remove from database
    const dbResult = await deleteUserPhotoFromDatabase(userId, userRole);
    if (!dbResult.success) {
      return { success: false, error: dbResult.error };
    }

    // Reset Clerk profile image to default
    const clerkResult = await syncPhotoToClerk("/noAvatar.png", userId);
    if (!clerkResult.success) {
      console.error("Database updated but Clerk sync failed:", clerkResult.error);
    }

    return { 
      success: true, 
      cloudinaryUrl: undefined 
    };
  } catch (error) {
    console.error("Photo deletion failed:", error);
    return { success: false, error: "Photo deletion failed" };
  }
};
