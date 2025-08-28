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
} from "./formValidationSchemas";
import prisma from "./prisma";
import { clerkClient } from "@clerk/nextjs/server";

type CurrentState = { success: boolean; error: boolean; message?: string };

export const createSubject = async (
  currentState: CurrentState,
  data: SubjectSchema
) => {
  try {
    // Validate data against schema
    const validatedData = subjectSchema.parse(data);

    await prisma.subject.create({
      data: {
        name: validatedData.name,
        teachers: {
          connect: validatedData.teachers.map((teacherId) => ({ id: teacherId })),
        },
      },
    });

    revalidatePath("/list/subjects");
    return { success: true, error: false, message: "Subject created successfully!" };
  } catch (err) {
    console.log(err);
    return { success: false, error: true, message: "Failed to create subject!" };
  }
};

export const updateSubject = async (
  currentState: CurrentState,
  data: SubjectSchema
) => {
  try {
    const validatedData = subjectSchema.parse(data);

    if (!validatedData.id) {
      return { success: false, error: true, message: "Subject ID is required for update!" };
    }

    await prisma.subject.update({
      where: {
        id: validatedData.id,
      },
      data: {
        name: validatedData.name,
        teachers: {
          set: validatedData.teachers.map((teacherId) => ({ id: teacherId })),
        },
      },
    });

    revalidatePath("/list/subjects");
    return { success: true, error: false, message: "Subject updated successfully!" };
  } catch (err) {
    console.log(err);
    return { success: false, error: true, message: "Failed to update subject!" };
  }
};

export const deleteSubject = async (
  currentState: CurrentState,
  data: FormData
) => {
  const id = data.get("id") as string;
  try {
    // Check if subject has any lessons
    const lessonsCount = await prisma.lesson.count({
      where: { subjectId: parseInt(id) },
    });

    if (lessonsCount > 0) {
      console.log(`Cannot delete subject: ${lessonsCount} lessons are associated with this subject`);
      return { success: false, error: true, message: "Cannot delete subject with associated lessons!" };
    }

    await prisma.subject.delete({
      where: {
        id: parseInt(id),
      },
    });

    revalidatePath("/list/subjects");
    return { success: true, error: false, message: "Subject deleted successfully!" };
  } catch (err) {
    console.log(err);
    return { success: false, error: true, message: "Failed to delete subject!" };
  }
};

export const createClass = async (
  currentState: CurrentState,
  data: ClassSchema
) => {
  try {
    const validatedData = classSchema.parse(data);

    await prisma.class.create({
      data: {
        name: validatedData.name,
        capacity: validatedData.capacity,
        gradeId: validatedData.gradeId,
        supervisorId: validatedData.supervisorId || undefined,
      },
    });

    revalidatePath("/list/classes");
    return { success: true, error: false, message: "Class created successfully!" };
  } catch (err) {
    console.log(err);
    return { success: false, error: true, message: "Failed to create class!" };
  }
};

export const updateClass = async (
  currentState: CurrentState,
  data: ClassSchema
) => {
  try {
    const validatedData = classSchema.parse(data);

    if (!validatedData.id) {
      return { success: false, error: true, message: "Class ID is required for update!" };
    }

    await prisma.class.update({
      where: {
        id: validatedData.id,
      },
      data: {
        name: validatedData.name,
        capacity: validatedData.capacity,
        gradeId: validatedData.gradeId,
        supervisorId: validatedData.supervisorId || undefined,
      },
    });

    revalidatePath("/list/classes");
    return { success: true, error: false, message: "Class updated successfully!" };
  } catch (err) {
    console.log(err);
    return { success: false, error: true, message: "Failed to update class!" };
  }
};

export const deleteClass = async (
  currentState: CurrentState,
  data: FormData
) => {
  const id = data.get("id") as string;
  try {
    await prisma.class.delete({
      where: {
        id: parseInt(id),
      },
    });

    revalidatePath("/list/classes");
    return { success: true, error: false, message: "Class deleted successfully!" };
  } catch (err) {
    console.log(err);
    return { success: false, error: true, message: "Failed to delete class!" };
  }
};

export const createTeacher = async (
  currentState: CurrentState,
  data: TeacherSchema
) => {
  try {
    const validatedData = teacherSchema.parse(data);

    const clerk = await clerkClient();
    const user = await clerk.users.createUser({
      username: validatedData.username,
      password: validatedData.password!,
      firstName: validatedData.name,
      lastName: validatedData.surname,
      publicMetadata: { role: "teacher" }
    });

    await prisma.teacher.create({
      data: {
        id: user.id,
        username: validatedData.username,
        name: validatedData.name,
        surname: validatedData.surname,
        email: validatedData.email || undefined,
        phone: validatedData.phone || undefined,
        address: validatedData.address,
        img: validatedData.img || undefined,
        sex: validatedData.sex,
        birthday: validatedData.birthday,
        subjects: {
          connect: validatedData.subjects?.map((subjectId: string) => ({
            id: parseInt(subjectId),
          })) || [],
        },
      },
    });

    revalidatePath("/list/teachers");
    return { success: true, error: false, message: "Teacher created successfully!" };
  } catch (err) {
    console.error("Create Teacher Error:", err);
    return { success: false, error: true, message: "Failed to create teacher!" };
  }
};

export const updateTeacher = async (
  currentState: CurrentState,
  data: TeacherSchema
) => {
  try {
    const validatedData = teacherSchema.parse(data);

    if (!validatedData.id) {
      return { success: false, error: true, message: "Teacher ID is required for update!" };
    }

    const clerk = await clerkClient();
    
    // Check if user exists in Clerk first
    try {
      await clerk.users.getUser(validatedData.id);
    } catch (clerkError: any) {
      if (clerkError.status === 404) {
        console.error(`Teacher with ID ${validatedData.id} not found in Clerk`);
        return { 
          success: false, 
          error: true, 
          message: "Teacher not found in authentication system. Please contact support." 
        };
      }
      throw clerkError; // Re-throw if it's a different error
    }

    // Update user in Clerk
    const user = await clerk.users.updateUser(validatedData.id, {
      username: validatedData.username,
      ...(validatedData.password && { password: validatedData.password }),
      firstName: validatedData.name,
      lastName: validatedData.surname,
    });

    // Update teacher in database
    await prisma.teacher.update({
      where: { id: validatedData.id },
      data: {
        username: validatedData.username,
        name: validatedData.name,
        surname: validatedData.surname,
        email: validatedData.email,
        phone: validatedData.phone,
        address: validatedData.address,
        sex: validatedData.sex,
        subjects: {
          set: validatedData.subjects?.map((subjectId: string) => ({
            id: parseInt(subjectId),
          })),
        },
      },
    });

    revalidatePath("/list/teachers");
    return { success: true, error: false, message: "Teacher updated successfully!" };
  } catch (err) {
    console.log("Update Teacher Error:", err);
    return { success: false, error: true, message: "Failed to update teacher!" };
  }
};
export const deleteTeacher = async (
  currentState: CurrentState,
  data: FormData
) => {
  const id = data.get("id") as string;
  try {
    const clerk = await clerkClient();
    await clerk.users.deleteUser(id);
    await prisma.teacher.delete({
      where: {
        id: id,
      },
    });

    revalidatePath("/list/teachers");
    return { success: true, error: false, message: "Teacher deleted successfully!" };
  } catch (err) {
    console.error("Delete Teacher Error:", err);
    return { success: false, error: true, message: "Failed to delete teacher!" };
  }
};

export const createStudent = async (
  currentState: CurrentState,
  data: StudentSchema
) => {
  try {
    const validatedData = studentSchema.parse(data);

    const classItem = await prisma.class.findUnique({
      where: { id: validatedData.classIds[0] },
      include: { _count: { select: { students: true } } },
    });

    if (classItem && classItem.capacity === classItem._count.students) {
      return { success: false, error: true, message: "Class capacity reached!" };
    }

    const clerk = await clerkClient();
    const user = await clerk.users.createUser({
      username: validatedData.username,
      password: validatedData.password!,
      firstName: validatedData.name,
      lastName: validatedData.surname,
      publicMetadata: { role: "student" }
    });

    const student = await prisma.student.create({
      data: {
        id: user.id,
        username: validatedData.username,
        name: validatedData.name,
        surname: validatedData.surname,
        email: validatedData.email || undefined,
        phone: validatedData.phone || undefined,
        address: validatedData.address,
        img: validatedData.img || undefined,
        sex: validatedData.sex,
        birthday: validatedData.birthday,
        gradeId: validatedData.gradeId,
        parentId: validatedData.parentId || undefined,
      },
    });

    // Create StudentClass entries for all selected classes
    await prisma.studentClass.createMany({
      data: validatedData.classIds.map((classId, index) => ({
        studentId: student.id,
        classId: classId,
        isPrimary: index === 0, // First class is primary
      })),
    });

    revalidatePath("/list/students");
    return { success: true, error: false, message: "Student created successfully!" };
  } catch (err) {
    console.error("Create Student Error:", err);
    return { success: false, error: true, message: "Failed to create student!" };
  }
};

export const updateStudent = async (
  currentState: CurrentState,
  data: StudentSchema
) => {
  try {
    const validatedData = studentSchema.parse(data);

    if (!validatedData.id) {
      return { success: false, error: true, message: "Student ID is required for update!" };
    }

    const clerk = await clerkClient();
    const user = await clerk.users.updateUser(validatedData.id, {
      username: validatedData.username,
      ...(validatedData.password && { password: validatedData.password }),
      firstName: validatedData.name,
      lastName: validatedData.surname,
    });

    await prisma.student.update({
      where: {
        id: validatedData.id,
      },
      data: {
        username: validatedData.username,
        name: validatedData.name,
        surname: validatedData.surname,
        email: validatedData.email || undefined,
        phone: validatedData.phone || undefined,
        address: validatedData.address,
        img: validatedData.img || undefined,
        sex: validatedData.sex,
        birthday: validatedData.birthday,
        gradeId: validatedData.gradeId,
        parentId: validatedData.parentId || undefined,
      },
    });

    // Update StudentClass entries
    // First, remove existing class associations
    await prisma.studentClass.deleteMany({
      where: { studentId: validatedData.id },
    });

    // Then create new associations
    await prisma.studentClass.createMany({
      data: validatedData.classIds.map((classId, index) => ({
        studentId: validatedData.id!,
        classId: classId,
        isPrimary: index === 0, // First class is primary
      })),
    });

    revalidatePath("/list/students");
    return { success: true, error: false, message: "Student updated successfully!" };
  } catch (err) {
    console.error("Update Student Error:", err);
    return { success: false, error: true, message: "Failed to update student!" };
  }
};

export const deleteStudent = async (
  currentState: CurrentState,
  data: FormData
) => {
  const id = data.get("id") as string;
  try {
    const clerk = await clerkClient();
    await clerk.users.deleteUser(id);
    await prisma.student.delete({
      where: {
        id: id,
      },
    });

    revalidatePath("/list/students");
    return { success: true, error: false, message: "Student deleted successfully!" };
  } catch (err) {
    console.error("Delete Student Error:", err);
    return { success: false, error: true, message: "Failed to delete student!" };
  }
};

export const createExam = async (
  currentState: CurrentState,
  data: ExamSchema
) => {
  try {
    const validatedData = examSchema.parse(data);

    await prisma.exam.create({
      data: {
        title: validatedData.title,
        startTime: validatedData.startTime,
        endTime: validatedData.endTime,
        // --- NEW: Conditionally set the correct ID ---
        lessonId: validatedData.lessonId || undefined,
        recurringLessonId: validatedData.recurringLessonId || undefined,
      },
    });

    revalidatePath("/list/exams");
    return { success: true, error: false, message: "Exam created successfully!" };
  } catch (err) {
    console.log(err);
    return { success: false, error: true, message: "Failed to create exam!" };
  }
};

export const updateExam = async (
  currentState: CurrentState,
  data: ExamSchema
) => {
  try {
    const validatedData = examSchema.parse(data);

    await prisma.exam.update({
      where: {
        id: validatedData.id,
      },
      data: {
        title: validatedData.title,
        startTime: validatedData.startTime,
        endTime: validatedData.endTime,
        documents: validatedData.documents || [],
        // --- NEW: Conditionally set the correct ID ---
        lessonId: validatedData.lessonId || undefined,
        recurringLessonId: validatedData.recurringLessonId || undefined,
      },
    });
    revalidatePath("/list/exams");
    return { success: true, error: false, message: "Exam updated successfully!" };
  } catch (err) {
    console.log(err);
    return { success: false, error: true, message: "Failed to update exam!" };
  }
};

export const deleteExam = async (
  currentState: CurrentState,
  data: FormData
) => {
  const id = data.get("id") as string;
  try {
    await prisma.exam.delete({
      where: {
        id: parseInt(id),
      },
    });

    revalidatePath("/list/exams");
    return { success: true, error: false, message: "Exam deleted successfully!" };
  } catch (err) {
    console.log(err);
    return { success: false, error: true, message: "Failed to delete exam!" };
  }
};

// The form now passes an extra 'rrule' property
interface LessonFormData extends LessonSchema {
  rrule: string | null;
}

export async function createLesson(payload: {
  name: string;
  subjectId: number;
  classId: number;
  teacherId: string;
  startTime: string;
  endTime: string;
}) {
  try {
    const startDate = new Date(payload.startTime);
    const dayNames = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"] as const;
    const dayOfWeek = dayNames[startDate.getDay()];
    
    await prisma.lesson.create({
      data: {
        name: payload.name,
        subjectId: Number(payload.subjectId),
        classId: Number(payload.classId),
        teacherId: payload.teacherId,
        startTime: startDate,
        endTime: new Date(payload.endTime),
        day: dayOfWeek,
        recurringLessonId: null,
      },
    });
    return { success: true, error: false, message: "Lesson created" };
  } catch (e: any) {
    return { success: false, error: true, message: e.message || "Create failed" };
  }
}

// CREATE — recurring (series)
export async function createRecurringLesson(payload: {
  name: string;
  subjectId: number;
  classId: number;
  teacherId: string;
  startTime: string;
  endTime: string;
  rrule: string; // required for weekly
}) {
  try {
    await prisma.recurringLesson.create({
      data: {
        name: payload.name,
        subjectId: Number(payload.subjectId),
        classId: Number(payload.classId),
        teacherId: payload.teacherId,
        startTime: new Date(payload.startTime),
        endTime: new Date(payload.endTime),
        rrule: payload.rrule,
      },
    });
    return { success: true, error: false, message: "Recurring lesson created" };
  } catch (e: any) {
    return { success: false, error: true, message: e.message || "Create failed" };
  }
}

// UPDATE — single
export async function updateLesson(payload: {
  id: number;
  name?: string;
  subjectId?: number;
  classId?: number;
  teacherId?: string;
  startTime?: string;
  endTime?: string;
}) {
  try {
    const { id, ...rest } = payload;
    const existing = await prisma.lesson.findUnique({ where: { id: Number(id) } });
    if (!existing) return { success: false, error: true, message: `Update failed: Lesson with ID ${id} not found.` };

    await prisma.lesson.update({
      where: { id: Number(id) },
      data: {
        ...(rest.name && { name: rest.name }),
        ...(rest.subjectId && { subjectId: Number(rest.subjectId) }),
        ...(rest.classId && { classId: Number(rest.classId) }),
        ...(rest.teacherId && { teacherId: rest.teacherId }),
        ...(rest.startTime && { startTime: new Date(rest.startTime) }),
        ...(rest.endTime && { endTime: new Date(rest.endTime) }),
      },
    });
    return { success: true, error: false, message: "Lesson updated" };
  } catch (e: any) {
    return { success: false, error: true, message: e.message || "Update failed" };
  }
}

// UPDATE — recurring
export async function updateRecurringLesson(payload: {
  id: number; // series id
  updateScope?: "series" | "instance";
  originalDate?: string; // when updating a single occurrence
  name?: string;
  subjectId?: number;
  classId?: number;
  teacherId?: string;
  startTime?: string;
  endTime?: string;
  rrule?: string | null;
}) {
  try {
    const { id, updateScope = "series", originalDate, ...rest } = payload;
    const series = await prisma.recurringLesson.findUnique({ where: { id: Number(id) } });
    if (!series) return { success: false, error: true, message: `Update failed: Recurring series with ID ${id} not found.` };

    if (updateScope === "series") {
      const updateData: any = {};
      if (rest.name !== undefined) updateData.name = rest.name;
      if (rest.subjectId !== undefined) updateData.subjectId = Number(rest.subjectId);
      if (rest.classId !== undefined) updateData.classId = Number(rest.classId);
      if (rest.teacherId !== undefined) updateData.teacherId = rest.teacherId;
      if (rest.startTime !== undefined) updateData.startTime = new Date(rest.startTime);
      if (rest.endTime !== undefined) updateData.endTime = new Date(rest.endTime);
      if (rest.rrule !== undefined) updateData.rrule = rest.rrule;

      await prisma.recurringLesson.update({
        where: { id: Number(id) },
        data: updateData,
      });
      return { success: true, error: false, message: "Recurring series updated" };
    }

    // updateScope === "instance" → copy-on-write an occurrence as a single lesson
    if (!originalDate) return { success: false, error: true, message: "originalDate required when updating a single instance." };

    const startDate = new Date(rest.startTime ?? originalDate);
    const dayNames = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"] as const;
    const dayOfWeek = dayNames[startDate.getDay()];

    await prisma.lesson.create({
      data: {
        name: rest.name ?? series.name,
        subjectId: Number(rest.subjectId ?? series.subjectId),
        classId: Number(rest.classId ?? series.classId),
        teacherId: rest.teacherId ?? series.teacherId,
        startTime: startDate,
        endTime: new Date(rest.endTime ?? originalDate),
        day: dayOfWeek,
        recurringLessonId: Number(id), // link to series
      },
    });
    return { success: true, error: false, message: "This instance updated (exception created)" };
  } catch (e: any) {
    return { success: false, error: true, message: e.message || "Update failed" };
  }
}

// DELETE — single
export async function deleteLesson(formData: FormData) {
  try {
    const id = Number(formData.get("id"));
    if (!id) return { success: false, error: true, message: "Invalid lesson id" };

    await prisma.lesson.delete({ where: { id } });
    return { success: true, error: false, message: "Lesson deleted" };
  } catch (e: any) {
    return { success: false, error: true, message: e.message || "Delete failed" };
  }
}

// DELETE — recurring (cascades children first)
export async function deleteRecurringLesson(formData: FormData) {
  try {
    const id = Number(formData.get("id"));
    if (!id) return { success: false, error: true, message: "Invalid recurring lesson id" };

    await prisma.$transaction(async (tx) => {
      await tx.lesson.deleteMany({ where: { recurringLessonId: id } });
      await tx.recurringLesson.delete({ where: { id } });
    });

    return { success: true, error: false, message: "Recurring lesson deleted" };
  } catch (e: any) {
    return { success: false, error: true, message: e.message || "Delete failed" };
  }
}



export const createParent = async (
  currentState: CurrentState,
  data: ParentSchema
) => {
  try {
    const validatedData = parentSchema.parse(data);

    // Check if password is provided for creation
    if (!validatedData.password) {
      console.error("Password is required for creating a new parent");
      return { success: false, error: true, message: "Password is required for creating a new parent" };
    }

    const clerk = await clerkClient();
    const user = await clerk.users.createUser({
      username: validatedData.username,
      password: validatedData.password,
      firstName: validatedData.name,
      lastName: validatedData.surname,
      publicMetadata: { role: "parent" },
    });

    const parent = await prisma.parent.create({
      data: {
        id: user.id,
        username: validatedData.username,
        name: validatedData.name,
        surname: validatedData.surname,
        email: validatedData.email || undefined,
        phone: validatedData.phone,
        address: validatedData.address,
      },
    });

    // Update students to link them to this parent if students were selected
    if (validatedData.students && validatedData.students.length > 0) {
      await prisma.student.updateMany({
        where: {
          id: {
            in: validatedData.students,
          },
        },
        data: {
          parentId: parent.id,
        },
      });
    }

    revalidatePath("/list/parents");
    return { success: true, error: false, message: "Parent created successfully!" };
  } catch (err) {
    console.error("Create Parent Error:", err);
    if (err && typeof err === 'object' && 'errors' in err) {
      console.error("Clerk validation errors:", err.errors);
    }
    return { success: false, error: true, message: "Failed to create parent!" };
  }
};

export const updateParent = async (
  currentState: CurrentState,
  data: ParentSchema
) => {
  try {
    const validatedData = parentSchema.parse(data);

    if (!validatedData.id) {
      return { success: false, error: true, message: "Parent ID is required for update!" };
    }

    const clerk = await clerkClient();
    const user = await clerk.users.updateUser(validatedData.id, {
      username: validatedData.username,
      ...(validatedData.password && { password: validatedData.password }),
      firstName: validatedData.name,
      lastName: validatedData.surname,
    });

    await prisma.parent.update({
      where: {
        id: validatedData.id,
      },
      data: {
        username: validatedData.username,
        name: validatedData.name,
        surname: validatedData.surname,
        email: validatedData.email || undefined,
        phone: validatedData.phone,
        address: validatedData.address,
      },
    });

    // Update students to link them to this parent if students were selected
    if (validatedData.students && validatedData.students.length > 0) {
      // First unlink all students from this parent
      await prisma.student.updateMany({
        where: {
          parentId: validatedData.id,
        },
        data: {
          parentId: undefined,
        },
      });

      // Then link the selected students
      await prisma.student.updateMany({
        where: {
          id: {
            in: validatedData.students,
          },
        },
        data: {
          parentId: validatedData.id,
        },
      });
    }

    revalidatePath("/list/parents");
    return { success: true, error: false, message: "Parent updated successfully!" };
  } catch (err) {
    console.error("Update Parent Error:", err);
    if (err && typeof err === 'object' && 'errors' in err) {
      console.error("Clerk validation errors:", err.errors);
    }
    return { success: false, error: true, message: "Failed to update parent!" };
  }
};

export const deleteParent = async (
  currentState: CurrentState,
  data: FormData
) => {
  const id = data.get("id") as string;
  try {
    const clerk = await clerkClient();
    await clerk.users.deleteUser(id);
    await prisma.parent.delete({
      where: {
        id: id,
      },
    });

    revalidatePath("/list/parents");
    return { success: true, error: false, message: "Parent deleted successfully!" };
  } catch (err) {
    console.error("Delete Parent Error:", err);
    return { success: false, error: true, message: "Failed to delete parent!" };
  }
};

export const createAssignment = async (
  currentState: CurrentState,
  data: AssignmentSchema
) => {
  try {
    const validatedData = assignmentSchema.parse(data);

    await prisma.assignment.create({
      data: {
        title: validatedData.title,
        startDate: validatedData.startDate,
        dueDate: validatedData.dueDate,
        documents: validatedData.documents || [], // Also handle documents on create
        
        // --- THIS IS THE FIX ---
        // Conditionally set the correct ID based on what was submitted.
        // The zod .refine() check ensures only one of them will have a value.
        lessonId: validatedData.lessonId || undefined,
        recurringLessonId: validatedData.recurringLessonId || undefined,
      },
    });

    revalidatePath("/list/assignments");
    return { success: true, error: false, message: "Assignment created successfully!" };
  } catch (err) {
    console.log(err);
    return { success: false, error: true, message: "Failed to create assignment!" };
  }
};

export const updateAssignment = async (
  currentState: CurrentState,
  data: AssignmentSchema
) => {
  try {
    const validatedData = assignmentSchema.parse(data);

    if (!validatedData.id) {
      return { success: false, error: true, message: "Assignment ID is required for update!" };
    }

    await prisma.assignment.update({
      where: {
        id: validatedData.id,
      },
      data: {
        title: validatedData.title,
        startDate: validatedData.startDate,
        dueDate: validatedData.dueDate,
        documents: validatedData.documents || [],
        
        // --- THIS IS THE FIX ---
        // Apply the same conditional logic for updates.
        lessonId: validatedData.lessonId || undefined,
        recurringLessonId: validatedData.recurringLessonId || undefined,
      },
    });

    revalidatePath("/list/assignments");
    return { success: true, error: false, message: "Assignment updated successfully!" };
  } catch (err) {
    console.log(err);
    return { success: false, error: true, message: "Failed to update assignment!" };
  }
};


export const deleteAssignment = async (
  currentState: CurrentState,
  data: FormData
) => {
  const id = data.get("id") as string;
  try {
    await prisma.assignment.delete({
      where: {
        id: parseInt(id),
      },
    });

    revalidatePath("/list/assignments");
    return { success: true, error: false, message: "Assignment deleted successfully!" };
  } catch (err) {
    console.log(err);
    return { success: false, error: true, message: "Failed to delete assignment!" };
  }
};

export const createResult = async (
  currentState: CurrentState,
  data: ResultSchema
) => {
  try {
    const validatedData = resultSchema.parse(data);

    await prisma.result.create({
      data: {
        title: validatedData.title,
        score: validatedData.score,
        examId: validatedData.examId || undefined,
        assignmentId: validatedData.assignmentId || undefined,
        studentId: validatedData.studentId,
      },
    });

    revalidatePath("/list/results");
    return { success: true, error: false, message: "Result created successfully!" };
  } catch (err) {
    console.log(err);
    return { success: false, error: true, message: "Failed to create result!" };
  }
};

export const updateResult = async (
  currentState: CurrentState,
  data: ResultSchema
) => {
  try {
    const validatedData = resultSchema.parse(data);

    if (!validatedData.id) {
      return { success: false, error: true, message: "Result ID is required for update!" };
    }

    await prisma.result.update({
      where: {
        id: validatedData.id,
      },
      data: {
        title: validatedData.title,
        score: validatedData.score,
        examId: validatedData.examId || undefined,
        assignmentId: validatedData.assignmentId || undefined,
        studentId: validatedData.studentId,
      },
    });

    revalidatePath("/list/results");
    return { success: true, error: false, message: "Result updated successfully!" };
  } catch (err) {
    console.log(err);
    return { success: false, error: true, message: "Failed to update result!" };
  }
};

export const deleteResult = async (
  currentState: CurrentState,
  data: FormData
) => {
  const id = data.get("id") as string;
  try {
    await prisma.result.delete({
      where: {
        id: parseInt(id),
      },
    });

    revalidatePath("/list/results");
    return { success: true, error: false, message: "Result deleted successfully!" };
  } catch (err) {
    console.log(err);
    return { success: false, error: true, message: "Failed to delete result!" };
  }
};

export const createEvent = async (
  currentState: CurrentState,
  data: EventSchema
) => {
  try {
    const validatedData = eventSchema.parse(data);

    await prisma.event.create({
      data: {
        title: validatedData.title,
        description: validatedData.description,
        startTime: validatedData.startTime,
        endTime: validatedData.endTime,
        classId: validatedData.classId || undefined,
      },
    });

    revalidatePath("/list/events");
    return { success: true, error: false, message: "Event created successfully!" };
  } catch (err) {
    console.log(err);
    return { success: false, error: true, message: "Failed to create event!" };
  }
};

export const updateEvent = async (
  currentState: CurrentState,
  data: EventSchema
) => {
  try {
    const validatedData = eventSchema.parse(data);

    if (!validatedData.id) {
      return { success: false, error: true, message: "Event ID is required for update!" };
    }

    await prisma.event.update({
      where: {
        id: validatedData.id,
      },
      data: {
        title: validatedData.title,
        description: validatedData.description,
        startTime: validatedData.startTime,
        endTime: validatedData.endTime,
        classId: validatedData.classId || undefined,
      },
    });

    revalidatePath("/list/events");
    return { success: true, error: false, message: "Event updated successfully!" };
  } catch (err) {
    console.log(err);
    return { success: false, error: true, message: "Failed to update event!" };
  }
};

export const deleteEvent = async (
  currentState: CurrentState,
  data: FormData
) => {
  const id = data.get("id") as string;
  try {
    await prisma.event.delete({
      where: {
        id: parseInt(id),
      },
    });

    revalidatePath("/list/events");
    return { success: true, error: false, message: "Event deleted successfully!" };
  } catch (err) {
    console.log(err);
    return { success: false, error: true, message: "Failed to delete event!" };
  }
};

export const createAnnouncement = async (
  currentState: CurrentState,
  data: AnnouncementSchema
) => {
  try {
    const validatedData = announcementSchema.parse(data);

    await prisma.announcement.create({
      data: {
        title: validatedData.title,
        description: validatedData.description,
        date: validatedData.date,
        classId: validatedData.classId || undefined,
      },
    });

    revalidatePath("/list/announcements");
    return { success: true, error: false, message: "Announcement created successfully!" };
  } catch (err) {
    console.log(err);
    return { success: false, error: true, message: "Failed to create announcement!" };
  }
};

export const updateAnnouncement = async (
  currentState: CurrentState,
  data: AnnouncementSchema
) => {
  try {
    const validatedData = announcementSchema.parse(data);

    if (!validatedData.id) {
      return { success: false, error: true, message: "Announcement ID is required for update!" };
    }

    await prisma.announcement.update({
      where: {
        id: validatedData.id,
      },
      data: {
        title: validatedData.title,
        description: validatedData.description,
        date: validatedData.date,
        classId: validatedData.classId || undefined,
      },
    });

    revalidatePath("/list/announcements");
    return { success: true, error: false, message: "Announcement updated successfully!" };
  } catch (err) {
    console.log(err);
    return { success: false, error: true, message: "Failed to update announcement!" };
  }
};

export const deleteAnnouncement = async (
  currentState: CurrentState,
  data: FormData
) => {
  const id = data.get("id") as string;
  try {
    await prisma.announcement.delete({
      where: {
        id: parseInt(id),
      },
    });

    revalidatePath("/list/announcements");
    return { success: true, error: false, message: "Announcement deleted successfully!" };
  } catch (err) {
    console.log(err);
    return { success: false, error: true, message: "Failed to delete announcement!" };
  }
};