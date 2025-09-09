"use server";

import { revalidatePath } from "next/cache";
import {
  AssignmentSchema,
  AnnouncementSchema,
  ClassSchema,
  EventSchema,
  ExamSchema,
  LessonSchema,
  ParentSchema,
  ResultSchema,
  StudentSchema,
  SubjectSchema,
  TeacherSchema,
  AdminSchema,
  parentSchema,
  studentSchema,
  teacherSchema,
  subjectSchema,
  classSchema,
  examSchema,
  lessonSchema,
  assignmentSchema,
  resultSchema,
  eventSchema,
  announcementSchema,
  adminSchema,
} from "./formValidationSchemas";
import prisma from "./prisma";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { RRule } from "rrule";

type CurrentState = { success: boolean; error: boolean; message?: string };

export interface PhotoUploadResult {
  success: boolean;
  error?: string;
  message?: string;
}

export const handlePhotoUpload = async (
  prevState: PhotoUploadResult,
  formData: FormData
): Promise<PhotoUploadResult> => {
  try {
    const photoUrl = formData.get("photoUrl") as string;
    const userId = formData.get("userId") as string;
    const userRole = formData.get("userRole") as string;

    console.log("=== Photo Upload Server Action ===");
    console.log("Photo URL:", photoUrl);
    console.log("User ID:", userId);
    console.log("User Role:", userRole);

    if (!photoUrl || !userId || !userRole) {
      console.error("Missing required data:", { photoUrl: !!photoUrl, userId: !!userId, userRole: !!userRole });
      return { success: false, error: "Missing required data" };
    }

    // Validate the photo URL
    try {
      new URL(photoUrl);
    } catch (urlError) {
      console.error("Invalid photo URL:", photoUrl);
      return { success: false, error: "Invalid photo URL" };
    }

    // Update database first
    console.log("Updating database...");
    const dbResult = await updateUserPhotoInDatabase(userId, userRole, photoUrl);
    if (!dbResult.success) {
      console.error("Database update failed:", dbResult.error);
      return { success: false, error: dbResult.error || "Database update failed" };
    }

    console.log("Database updated successfully");

    // Sync to Clerk (non-blocking - if it fails, we still consider the operation successful)
    console.log("Syncing to Clerk...");
    try {
      const clerkResult = await syncPhotoToClerk(photoUrl, userId);
      if (clerkResult.success) {
        console.log("Clerk sync successful");
      } else {
        console.warn("Clerk sync failed (non-blocking):", clerkResult.error);
      }
    } catch (clerkError) {
      console.warn("Clerk sync error (non-blocking):", clerkError);
    }

    // Revalidate the relevant pages
    console.log("Revalidating pages...");
    revalidatePath(`/list/${userRole}s`);
    revalidatePath(`/list/${userRole}s/${userId}`);
    revalidatePath('/');

    console.log("Photo upload completed successfully");
    return { 
      success: true, 
      message: "Photo updated successfully" 
    };
  } catch (error) {
    console.error("Photo upload failed with error:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Photo upload failed" 
    };
  }
};

const syncPhotoToClerk = async (
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

    console.log("Syncing photo to Clerk for user:", userId);

    const response = await fetch(photoUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }
    
    const imageBlob = await response.blob();
    console.log("Image blob size:", imageBlob.size);

    const client = await clerkClient();
    await client.users.updateUserProfileImage(userId, {
      file: imageBlob,
    });

    console.log("Clerk photo sync completed");
    return { success: true };
  } catch (error) {
    console.error("Failed to sync photo to Clerk:", error);
    return { success: false, error: "Failed to sync photo to Clerk" };
  }
};

const updateUserPhotoInDatabase = async (
  userId: string,
  userRole: string,
  photoUrl: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    console.log("Updating database for:", { userId, userRole, photoUrl });
    
    const normalizedRole = userRole.toLowerCase();
    
    switch (normalizedRole) {
      case "teacher":
        await prisma.teacher.update({
          where: { id: userId },
          data: { img: photoUrl },
        });
        console.log("Teacher photo updated in database");
        break;
      case "student":
        await prisma.student.update({
          where: { id: userId },
          data: { img: photoUrl },
        });
        console.log("Student photo updated in database");
        break;
      case "admin":
        await prisma.admin.update({
          where: { id: userId },
          data: { img: photoUrl },
        });
        console.log("Admin photo updated in database");
        break;
      default:
        console.error("Invalid user role:", userRole);
        return { success: false, error: `Invalid user role: ${userRole}` };
    }

    // Verify the update worked
    let updatedRecord;
    switch (normalizedRole) {
      case "teacher":
        updatedRecord = await prisma.teacher.findUnique({ where: { id: userId }, select: { img: true } });
        break;
      case "student":
        updatedRecord = await prisma.student.findUnique({ where: { id: userId }, select: { img: true } });
        break;
      case "admin":
        updatedRecord = await prisma.admin.findUnique({ where: { id: userId }, select: { img: true } });
        break;
    }
    
    console.log("Updated record verification:", updatedRecord);
    
    if (!updatedRecord || updatedRecord.img !== photoUrl) {
      console.error("Photo update verification failed");
      return { success: false, error: "Photo update verification failed" };
    }

    return { success: true };
  } catch (error) {
    console.error("Database update error:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Database update failed" 
    };
  }
};

// The rest of the file remains unchanged