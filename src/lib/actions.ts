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
import { handlePhotoUpload as handlePhotoUploadSync, handlePhotoDelete as handlePhotoDeleteSync } from "./photoSync";
import { safeDeleteClerkUser } from "@/lib/clerkSafe";
import { createClerkUserWithRollback } from "./clerkUtils";

type CurrentState = { success: boolean; error: boolean; message?: string };


export interface PhotoUploadResult {
  success: boolean;
  error?: string;
  message?: string;
}

export interface ActionResult {
  success: boolean;
  error?: string;
  message?: string;
}

export const handlePhotoUpload = async (
  currentState: ActionResult,
  formData: FormData
): Promise<ActionResult> => {
  try {
    const photoUrl = formData.get("photoUrl") as string;
    const userId = formData.get("userId") as string;
    const userRole = formData.get("userRole") as string;

    if (!photoUrl || !userId || !userRole) {
      return { success: false, error: "Missing required fields" };
    }

    // Use the sync function which handles both database and Clerk updates
    const result = await handlePhotoUploadSync(
      { secure_url: photoUrl },
      userId,
      userRole
    );

    if (result.success) {
      // Force refresh of any cached data
      revalidatePath("/");
      return { 
        success: true, 
        message: "Photo updated successfully!" 
      };
    } else {
      return { 
        success: false, 
        error: result.error || "Failed to update photo" 
      };
    }
  } catch (error) {
    console.error("Photo upload action error:", error);
    return { success: false, error: "Failed to upload photo" };
  }
};

export const deleteUserPhoto = async (
  currentState: ActionResult,
  formData: FormData
): Promise<ActionResult> => {
  try {
    const userId = formData.get("userId") as string;
    const userRole = formData.get("userRole") as string;

    if (!userId || !userRole) {
      return { success: false, error: "Missing required fields" };
    }

    const result = await handlePhotoDeleteSync(userId, userRole);

    if (result.success) {
      revalidatePath("/");
      return { 
        success: true, 
        message: "Photo removed successfully!" 
      };
    } else {
      return { 
        success: false, 
        error: result.error || "Failed to remove photo" 
      };
    }
  } catch (error) {
    console.error("Photo delete action error:", error);
    return { success: false, error: "Failed to remove photo" };
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
    console.log("=== Database Update Debug ===");
    console.log("User ID:", userId);
    console.log("User Role:", userRole);
    console.log("Photo URL:", photoUrl);
    
    const normalizedRole = userRole.toLowerCase();
    console.log("Normalized Role:", normalizedRole);
    
    let updateResult;
    
    switch (normalizedRole) {
      case "teacher":
        console.log("Updating teacher...");
        updateResult = await prisma.teacher.update({
          where: { id: userId },
          data: { img: photoUrl },
        });
        console.log("Teacher update result:", updateResult);
        break;
      case "student":
        console.log("Updating student...");
        updateResult = await prisma.student.update({
          where: { id: userId },
          data: { img: photoUrl },
        });
        console.log("Student update result:", updateResult);
        break;
      case "admin":
        console.log("Updating admin...");
        updateResult = await prisma.admin.update({
          where: { id: userId },
          data: { img: photoUrl },
        });
        console.log("Admin update result:", updateResult);
        break;
      default:
        console.error("Invalid user role:", userRole);
        return { success: false, error: `Invalid user role: ${userRole}` };
    }

    // Verify the update worked by fetching the record
    let verificationRecord;
    switch (normalizedRole) {
      case "teacher":
        verificationRecord = await prisma.teacher.findUnique({ 
          where: { id: userId }, 
          select: { img: true, name: true } 
        });
        break;
      case "student":
        verificationRecord = await prisma.student.findUnique({ 
          where: { id: userId }, 
          select: { img: true, name: true } 
        });
        break;
      case "admin":
        verificationRecord = await prisma.admin.findUnique({ 
          where: { id: userId }, 
          select: { img: true, name: true } 
        });
        break;
    }
    
    console.log("Verification record:", verificationRecord);
    
    if (!verificationRecord) {
      console.error("User not found after update");
      return { success: false, error: "User not found after update" };
    }
    
    if (verificationRecord.img !== photoUrl) {
      console.error("Photo URL mismatch after update");
      console.error("Expected:", photoUrl);
      console.error("Actual:", verificationRecord.img);
      return { success: false, error: "Photo update verification failed" };
    }

    console.log("Database update successful and verified");
    return { success: true };
  } catch (error) {
    console.error("Database update error:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Database update failed" 
    };
  }
};

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
  let clerkRollback: (() => Promise<void>) | null = null;
  
  try {
    const validatedData = teacherSchema.parse(data);

    // Create user in Clerk with rollback capability
    const { user, rollback } = await createClerkUserWithRollback({
      username: validatedData.username,
      password: validatedData.password!,
      firstName: validatedData.name,
      lastName: validatedData.surname,
      publicMetadata: { role: "teacher" }
    });
    
    clerkRollback = rollback;

    // Create teacher in database
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
    
    // Rollback Clerk user if it was created
    if (clerkRollback) {
      await clerkRollback();
    }
    
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
    // Best-effort delete in Clerk (ignore 404)
    await safeDeleteClerkUser(id);

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

export const createAdmin = async (
  currentState: CurrentState,
  data: AdminSchema
) => {
  let clerkRollback: (() => Promise<void>) | null = null;
  
  try {
    const validatedData = adminSchema.parse(data);

    // Create user in Clerk with rollback capability
    const { user, rollback } = await createClerkUserWithRollback({
      username: validatedData.username,
      password: validatedData.password!,
      firstName: validatedData.name,
      lastName: validatedData.surname,
      publicMetadata: { role: "admin" }
    });
    
    clerkRollback = rollback;

    await prisma.admin.create({
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
      },
    });

    revalidatePath("/list/admins");
    return { success: true, error: false, message: "Admin created successfully!" };
  } catch (err) {
    console.error("Create Admin Error:", err);
    
    // Rollback Clerk user if it was created
    if (clerkRollback) {
      await clerkRollback();
    }
    
    return { success: false, error: true, message: "Failed to create admin!" };
  }
};

export const updateAdmin = async (
  currentState: CurrentState,
  data: AdminSchema
) => {
  try {
    const validatedData = adminSchema.parse(data);

    if (!validatedData.id) {
      return { success: false, error: true, message: "Admin ID is required for update!" };
    }

    const clerk = await clerkClient();
    
    await clerk.users.updateUser(validatedData.id, {
      username: validatedData.username,
      ...(validatedData.password && { password: validatedData.password }),
      firstName: validatedData.name,
      lastName: validatedData.surname,
    });

    await prisma.admin.update({
      where: { id: validatedData.id },
      data: {
        username: validatedData.username,
        name: validatedData.name,
        surname: validatedData.surname,
        email: validatedData.email,
        phone: validatedData.phone,
        address: validatedData.address,
        sex: validatedData.sex,
        birthday: validatedData.birthday,
      },
    });

    revalidatePath("/list/admins");
    return { success: true, error: false, message: "Admin updated successfully!" };
  } catch (err) {
    console.log("Update Admin Error:", err);
    return { success: false, error: true, message: "Failed to update admin!" };
  }
};

export const deleteAdmin = async (
  currentState: CurrentState,
  data: FormData
) => {
  const id = data.get("id") as string;
  try {
    // Best-effort delete in Clerk (ignore 404)
    await safeDeleteClerkUser(id);

    await prisma.admin.delete({
      where: {
        id: id,
      },
    });

    revalidatePath("/list/admins");
    return { success: true, error: false, message: "Admin deleted successfully!" };
  } catch (err) {
    console.error("Delete Admin Error:", err);
    return { success: false, error: true, message: "Failed to delete admin!" };
  }
};

export const createStudent = async (
  currentState: CurrentState,
  data: StudentSchema
) => {
  let clerkRollback: (() => Promise<void>) | null = null;
  
  try {
    const validatedData = studentSchema.parse(data);

    const classItem = await prisma.class.findUnique({
      where: { id: validatedData.classIds[0] },
      include: { _count: { select: { students: true } } },
    });

    if (classItem && classItem.capacity === classItem._count.students) {
      return { success: false, error: true, message: "Class capacity reached!" };
    }

    // Create user in Clerk with rollback capability
    const { user, rollback } = await createClerkUserWithRollback({
      username: validatedData.username,
      password: validatedData.password!,
      firstName: validatedData.name,
      lastName: validatedData.surname,
      publicMetadata: { role: "student" }
    });
    
    clerkRollback = rollback;

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
        school: validatedData.school || undefined,
        status: validatedData.status,
      },
    });

    // Create StudentClass entries for all selected classes
    await prisma.studentClass.createMany({
      data: validatedData.classIds.map((classId, index) => ({
        studentId: student.id,
        classId: classId,
        isPrimary: index === 0,
      })),
    });

    revalidatePath("/list/students");
    return { success: true, error: false, message: "Student created successfully!" };
  } catch (err) {
    console.error("Create Student Error:", err);
    
    // Rollback Clerk user if it was created
    if (clerkRollback) {
      await clerkRollback();
    }
    
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
        school: validatedData.school || undefined,
        status: validatedData.status, // NEW
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
    // Best-effort delete in Clerk (ignore 404)
    await safeDeleteClerkUser(id);

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

export const createParent = async (
  currentState: CurrentState,
  data: ParentSchema
) => {
  let clerkRollback: (() => Promise<void>) | null = null;
  
  try {
    const validatedData = parentSchema.parse(data);

    // Check if password is provided for creation
    if (!validatedData.password) {
      console.error("Password is required for creating a new parent");
      return { success: false, error: true, message: "Password is required for creating a new parent" };
    }

    // Create user in Clerk with rollback capability
    const { user, rollback } = await createClerkUserWithRollback({
      username: validatedData.username,
      password: validatedData.password,
      firstName: validatedData.name,
      lastName: validatedData.surname,
      publicMetadata: { role: "parent" }
    });
    
    clerkRollback = rollback;

    const parent = await prisma.parent.create({
      data: {
        id: user.id,
        username: validatedData.username,
        name: validatedData.name,
        surname: validatedData.surname,
        email: validatedData.email || undefined,
        phone: validatedData.phone,
        address: validatedData.address,
        paymentType: validatedData.paymentType,
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
    
    // Rollback Clerk user if it was created
    if (clerkRollback) {
      await clerkRollback();
    }
    
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
        // NEW: persist payment type
        paymentType: validatedData.paymentType,
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
    // Best-effort delete in Clerk (ignore 404)
    await safeDeleteClerkUser(id);

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
  currentState: { success: boolean; error: boolean; message: string },
  data: any
) => {
  try {
    console.log("Creating result with data:", data);
    
    const result = await prisma.result.create({
      data: {
        title: data.title,
        score: parseInt(data.score),
        studentId: data.studentId,
        ...(data.examId && { examId: parseInt(data.examId) }),
        ...(data.assignmentId && { assignmentId: parseInt(data.assignmentId) }),
        documents: data.documents || [],
      },
    });

    console.log("Created result:", result);
    revalidatePath("/list/results");
    return { success: true, error: false, message: "Result created successfully!" };
  } catch (err) {
    console.error("Error creating result:", err);
    return { success: false, error: true, message: "Failed to create result!" };
  }
};

export const updateResult = async (
  currentState: { success: boolean; error: boolean; message: string },
  data: any
) => {
  try {
    console.log("Updating result with data:", data);
    
    const result = await prisma.result.update({
      where: { id: parseInt(data.id) },
      data: {
        title: data.title,
        score: parseInt(data.score),
        studentId: data.studentId,
        ...(data.examId && { examId: parseInt(data.examId) }),
        ...(data.assignmentId && { assignmentId: parseInt(data.assignmentId) }),
        documents: data.documents || [],
      },
    });

    console.log("Updated result:", result);
    revalidatePath("/list/results");
    return { success: true, error: false, message: "Result updated successfully!" };
  } catch (err) {
    console.error("Error updating result:", err);
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
  data: EventSchema & { userIds?: string[] | null; gradeIds?: number[] | null }
) => {
  try {
    const validatedData = eventSchema.parse(data);

    const event = await prisma.event.create({
      data: {
        title: validatedData.title,
        description: validatedData.description,
        startTime: validatedData.startTime,
        endTime: validatedData.endTime,
        classId: validatedData.classId || undefined,
      },
    });

    // Create EventUser relationships if userIds are provided
    if (data.userIds && data.userIds.length > 0) {
      await prisma.eventUser.createMany({
        data: data.userIds.map(userId => ({
          eventId: event.id,
          userId: userId,
        })),
        skipDuplicates: true,
      });
    }

    // Create EventGrade relationships if gradeIds are provided
    if (data.gradeIds && data.gradeIds.length > 0) {
      await prisma.eventGrade.createMany({
        data: data.gradeIds.map(gradeId => ({
          eventId: event.id,
          gradeId: gradeId,
        })),
        skipDuplicates: true,
      });
    }

    revalidatePath("/list/events");
    return { success: true, error: false, message: "Event created successfully!" };
  } catch (err) {
    console.log(err);
    return { success: false, error: true, message: "Failed to create event!" };
  }
};

export const updateEvent = async (
  currentState: CurrentState,
  data: EventSchema & { userIds?: string[] | null; gradeIds?: number[] | null }
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

    // Update EventUser relationships
    await prisma.eventUser.deleteMany({
      where: { eventId: validatedData.id },
    });

    if (data.userIds && data.userIds.length > 0) {
      await prisma.eventUser.createMany({
        data: data.userIds.map(userId => ({
          eventId: validatedData.id!,
          userId: userId,
        })),
        skipDuplicates: true,
      });
    }

    // Update EventGrade relationships
    await prisma.eventGrade.deleteMany({
      where: { eventId: validatedData.id },
    });

    if (data.gradeIds && data.gradeIds.length > 0) {
      await prisma.eventGrade.createMany({
        data: data.gradeIds.map(gradeId => ({
          eventId: validatedData.id!,
          gradeId: gradeId,
        })),
        skipDuplicates: true,
      });
    }

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
  
  if (!id) {
    return { success: false, error: true, message: "Event ID is required for deletion!" };
  }

  try {
    const eventId = parseInt(id);
    
    if (isNaN(eventId)) {
      return { success: false, error: true, message: "Invalid event ID format!" };
    }

    // Check if the event exists before attempting to delete
    const existingEvent = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        eventUsers: true,
        eventGrades: true,
      },
    });

    if (!existingEvent) {
      return { success: false, error: true, message: "Event not found!" };
    }

    // Delete the event (cascading deletes will handle related records)
    await prisma.event.delete({
      where: {
        id: eventId,
      },
    });

    revalidatePath("/list/events");
    return { success: true, error: false, message: "Event deleted successfully!" };
  } catch (err) {
    console.error("Delete Event Error:", err);
    
    // Handle specific Prisma errors
    if (err && typeof err === 'object' && 'code' in err) {
      if (err.code === 'P2025') {
        return { success: false, error: true, message: "Event not found or already deleted!" };
      }
      if (err.code === 'P2003') {
        return { success: false, error: true, message: "Cannot delete event due to related records!" };
      }
    }
    
    return { success: false, error: true, message: "Failed to delete event!" };
  }
};

export const createAnnouncement = async (
  currentState: CurrentState,
  data: AnnouncementSchema & { userIds?: string[] | null; gradeIds?: number[] | null }
) => {
  try {
    const validatedData = announcementSchema.parse(data);

    const announcement = await prisma.announcement.create({
      data: {
        title: validatedData.title,
        description: validatedData.description,
        date: validatedData.date,
        classId: validatedData.classId || undefined,
      },
    });

    // Create AnnouncementUser relationships if userIds are provided
    if (data.userIds && data.userIds.length > 0) {
      await prisma.announcementUser.createMany({
        data: data.userIds.map(userId => ({
          announcementId: announcement.id,
          userId: userId,
        })),
        skipDuplicates: true,
      });
    }

    // Create AnnouncementGrade relationships if gradeIds are provided
    if (data.gradeIds && data.gradeIds.length > 0) {
      await prisma.announcementGrade.createMany({
        data: data.gradeIds.map(gradeId => ({
          announcementId: announcement.id,
          gradeId: gradeId,
        })),
        skipDuplicates: true,
      });
    }

    revalidatePath("/list/announcements");
    return { success: true, error: false, message: "Announcement created successfully!" };
  } catch (err) {
    console.log(err);
    return { success: false, error: true, message: "Failed to create announcement!" };
  }
};

export const updateAnnouncement = async (
  currentState: CurrentState,
  data: AnnouncementSchema & { userIds?: string[] | null; gradeIds?: number[] | null }
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

    // Update AnnouncementUser relationships
    await prisma.announcementUser.deleteMany({
      where: { announcementId: validatedData.id },
    });

    if (data.userIds && data.userIds.length > 0) {
      await prisma.announcementUser.createMany({
        data: data.userIds.map(userId => ({
          announcementId: validatedData.id!,
          userId: userId,
        })),
        skipDuplicates: true,
      });
    }

    // Update AnnouncementGrade relationships
    await prisma.announcementGrade.deleteMany({
      where: { announcementId: validatedData.id },
    });

    if (data.gradeIds && data.gradeIds.length > 0) {
      await prisma.announcementGrade.createMany({
        data: data.gradeIds.map(gradeId => ({
          announcementId: validatedData.id!,
          gradeId: gradeId,
        })),
        skipDuplicates: true,
      });
    }

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

export const addStudentToClass = async (
  currentState: { success: boolean; error: boolean },
  data: FormData
) => {
  try {
    const classId = parseInt(data.get("classId") as string);
    const studentId = data.get("studentId") as string;

    await prisma.studentClass.create({
      data: {
        classId,
        studentId,
      },
    });

    revalidatePath(`/list/classes/${classId}`);
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};