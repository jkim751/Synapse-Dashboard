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

    const response = await fetch(photoUrl);
    const imageBlob = await response.blob();

    await (await clerkClient()).users.updateUserProfileImage(userId, {
      file: imageBlob,
    });

    return { success: true };
  } catch (error) {
    console.error("Failed to sync photo to Clerk:", error);
    return { success: false, error: "Failed to sync photo to Clerk" };
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

export const handlePhotoUpload = async (
  cloudinaryResult: any,
  userId: string,
  userRole: string
): Promise<PhotoUploadResult> => {
  try {
    const photoUrl = cloudinaryResult.secure_url;
    
    // Update database
    const dbResult = await updateUserPhotoInDatabase(userId, userRole, photoUrl);
    if (!dbResult.success) {
      return { success: false, error: dbResult.error };
    }

    // Sync to Clerk
    const clerkResult = await syncPhotoToClerk(photoUrl, userId);
    if (!clerkResult.success) {
      console.warn("Database updated but Clerk sync failed:", clerkResult.error);
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
