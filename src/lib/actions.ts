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
        supervisorId: validatedData.supervisorId || null,
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
        supervisorId: validatedData.supervisorId || null,
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
        email: validatedData.email || null,
        phone: validatedData.phone || null,
        address: validatedData.address,
        img: validatedData.img || null,
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
    const user = await clerk.users.updateUser(validatedData.id, {
      username: validatedData.username,
      ...(validatedData.password && { password: validatedData.password }),
      firstName: validatedData.name,
      lastName: validatedData.surname,
    });

    await prisma.teacher.update({
      where: {
        id: validatedData.id,
      },
      data: {
        username: validatedData.username,
        name: validatedData.name,
        surname: validatedData.surname,
        email: validatedData.email || null,
        phone: validatedData.phone || null,
        address: validatedData.address,
        img: validatedData.img || null,
        sex: validatedData.sex,
        birthday: validatedData.birthday,
        subjects: {
          set: validatedData.subjects?.map((subjectId: string) => ({
            id: parseInt(subjectId),
          })) || [],
        },
      },
    });

    revalidatePath("/list/teachers");
    return { success: true, error: false, message: "Teacher updated successfully!" };
  } catch (err) {
    console.error("Update Teacher Error:", err);
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

    await prisma.student.create({
      data: {
        id: user.id,
        username: validatedData.username,
        name: validatedData.name,
        surname: validatedData.surname,
        email: validatedData.email || null,
        phone: validatedData.phone || null,
        address: validatedData.address,
        img: validatedData.img || null,
        sex: validatedData.sex,
        birthday: validatedData.birthday,
        gradeId: validatedData.gradeId,
        classId: validatedData.classIds[0],
        parentId: validatedData.parentId || null,
      },
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
        email: validatedData.email || null,
        phone: validatedData.phone || null,
        address: validatedData.address,
        img: validatedData.img || null,
        sex: validatedData.sex,
        birthday: validatedData.birthday,
        gradeId: validatedData.gradeId,
        classId: validatedData.classIds,
        parentId: validatedData.parentId || null,
      },
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
        lessonId: validatedData.lessonId,
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

    if (!validatedData.id) {
      return { success: false, error: true, message: "Exam ID is required for update!" };
    }

    await prisma.exam.update({
      where: {
        id: validatedData.id,
      },
      data: {
        title: validatedData.title,
        startTime: validatedData.startTime,
        endTime: validatedData.endTime,
        lessonId: validatedData.lessonId,
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

export const createLesson = async (
  currentState: CurrentState,
  data: LessonSchema
) => {
  try {
    const validatedData = lessonSchema.parse(data);

    await prisma.lesson.create({
      data: {
        name: validatedData.name,
        day: validatedData.day,
        startTime: validatedData.startTime,
        endTime: validatedData.endTime,
        subjectId: validatedData.subjectId,
        classId: validatedData.classId,
        teacherId: validatedData.teacherId,
      },
    });

    revalidatePath("/list/lessons");
    return { success: true, error: false, message: "Lesson created successfully!" };
  } catch (err) {
    console.log(err);
    return { success: false, error: true, message: "Failed to create lesson!" };
  }
};

export const updateLesson = async (
  currentState: CurrentState,
  data: LessonSchema
) => {
  try {
    const validatedData = lessonSchema.parse(data);

    if (!validatedData.id) {
      return { success: false, error: true, message: "Lesson ID is required for update!" };
    }

    await prisma.lesson.update({
      where: {
        id: validatedData.id,
      },
      data: {
        name: validatedData.name,
        day: validatedData.day,
        startTime: validatedData.startTime,
        endTime: validatedData.endTime,
        subjectId: validatedData.subjectId,
        classId: validatedData.classId,
        teacherId: validatedData.teacherId,
      },
    });

    revalidatePath("/list/lessons");
    return { success: true, error: false, message: "Lesson updated successfully!" };
  } catch (err) {
    console.log(err);
    return { success: false, error: true, message: "Failed to update lesson!" };
  }
};

export const deleteLesson = async (
  currentState: CurrentState,
  data: FormData
) => {
  const id = data.get("id") as string;
  try {
    await prisma.lesson.delete({
      where: {
        id: parseInt(id),
      },
    });

    revalidatePath("/list/lessons");
    return { success: true, error: false, message: "Lesson deleted successfully!" };
  } catch (err) {
    console.log(err);
    return { success: false, error: true, message: "Failed to delete lesson!" };
  }
};

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
        email: validatedData.email || null,
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
        email: validatedData.email || null,
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
          parentId: null,
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
        lessonId: validatedData.lessonId,
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
        lessonId: validatedData.lessonId,
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
        examId: validatedData.examId || null,
        assignmentId: validatedData.assignmentId || null,
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
        examId: validatedData.examId || null,
        assignmentId: validatedData.assignmentId || null,
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
        classId: validatedData.classId || null,
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
        classId: validatedData.classId || null,
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
        classId: validatedData.classId || null,
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
        classId: validatedData.classId || null,
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