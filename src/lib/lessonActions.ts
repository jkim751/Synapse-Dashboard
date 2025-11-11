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

// Helper function to parse datetime-local string as local time
function parseLocalDateTime(dateTimeString: string): Date {
  // datetime-local format: "YYYY-MM-DDTHH:mm"
  const [datePart, timePart] = dateTimeString.split('T');
  const [year, month, day] = datePart.split('-').map(Number);
  const [hours, minutes] = timePart.split(':').map(Number);
  
  // Create date in local timezone
  return new Date(year, month - 1, day, hours, minutes, 0, 0);
}

export async function handleLessonFormSubmission(
  type: "create" | "update",
  payload: LessonFormPayload
) {
  try {
    // Parse times as local
    const startTime = parseLocalDateTime(payload.startTime);
    const endTime = parseLocalDateTime(payload.endTime);
    
    // For creation
    if (type === "create") {
      if (payload.repeats === "weekly" && payload.rrule) {
        return await createRecurringLesson({
          name: payload.name,
          subjectId: Number(payload.subjectId),
          classId: Number(payload.classId),
          teacherId: payload.teacherId,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          rrule: payload.rrule,
        });
      } else {
        return await createLesson({
          name: payload.name,
          subjectId: Number(payload.subjectId),
          classId: Number(payload.classId),
          teacherId: payload.teacherId,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
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
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
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
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
        });
      }
    }

    return { success: false, error: true, message: "Invalid operation" };
  } catch (error: any) {
    console.error("Lesson form submission error:", error);
    return { success: false, error: true, message: error.message || "Operation failed" };
  }
}