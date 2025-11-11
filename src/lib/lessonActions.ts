"use server";

import { createLesson, createRecurringLesson, updateLesson, updateRecurringLesson } from "./actions";
import { revalidatePath } from "next/cache";

type LessonFormPayload = {
  name: string;
  subjectId: number;
  classId: number;
  teacherId: string;
  startTime: string;
  endTime: string;
  repeats: "never" | "weekly";
  rrule?: string | null;
  variant?: "single" | "recurring";
  id?: number;
  updateScope?: "series" | "instance";
  originalDate?: string;
};

export async function handleLessonFormSubmission(
  type: "create" | "update",
  payload: LessonFormPayload
) {
  try {
    // Pass the datetime-local strings directly without conversion
    // The server actions will handle the timezone-aware conversion
    
    // For creation
    if (type === "create") {
      if (payload.repeats === "weekly" && payload.rrule) {
        return await createRecurringLesson({
          name: payload.name,
          subjectId: Number(payload.subjectId),
          classId: Number(payload.classId),
          teacherId: payload.teacherId,
          startTime: payload.startTime,
          endTime: payload.endTime,
          rrule: payload.rrule,
        });
      } else {
        return await createLesson({
          name: payload.name,
          subjectId: Number(payload.subjectId),
          classId: Number(payload.classId),
          teacherId: payload.teacherId,
          startTime: payload.startTime,
          endTime: payload.endTime,
        });
      }
    }

    // For updates
    if (type === "update" && payload.id) {
      if (payload.variant === "recurring") {
        return await updateRecurringLesson({
          id: payload.id,
          name: payload.name,
          subjectId: Number(payload.subjectId),
          classId: Number(payload.classId),
          teacherId: payload.teacherId,
          startTime: payload.startTime,
          endTime: payload.endTime,
          updateScope: payload.updateScope,
          originalDate: payload.originalDate,
          rrule: payload.rrule,
        });
      } else {
        return await updateLesson({
          id: payload.id,
          name: payload.name,
          subjectId: Number(payload.subjectId),
          classId: Number(payload.classId),
          teacherId: payload.teacherId,
          startTime: payload.startTime,
          endTime: payload.endTime,
        });
      }
    }

    return { success: false, error: true, message: "Invalid operation" };
  } catch (error: any) {
    console.error("Lesson form submission error:", error);
    return { success: false, error: true, message: error.message || "Operation failed" };
  }
}