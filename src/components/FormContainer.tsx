import prisma from "@/lib/prisma";
import FormModal from "./FormModal";
import { auth } from "@clerk/nextjs/server";

export type FormContainerProps = {
  table:
    | "teacher"
    | "student"
    | "parent"
    | "subject"
    | "class"
    | "lesson"
    | "exam"
    | "assignment"
    | "result"
    | "event"
    | "announcement";
  type: "create" | "update" | "delete";
  data?: any;
  id?: number | string;
};

const FormContainer = async ({ table, type, data, id }: FormContainerProps) => {
  let relatedData = {};

  const { userId, sessionClaims } = await auth();
  const role = (sessionClaims?.metadata as { role?: string })?.role;
  const currentUserId = userId;

  if (type !== "delete") {
    switch (table) {
      case "subject":
        const subjectTeachers = await prisma.teacher.findMany({
          select: { id: true, name: true, surname: true },
        });
        relatedData = { teachers: subjectTeachers };
        break;
      case "class":
        const classGrades = await prisma.grade.findMany({
          select: { id: true, level: true },
        });
        const classTeachers = await prisma.teacher.findMany({
          select: { id: true, name: true, surname: true },
        });
        relatedData = { teachers: classTeachers, grades: classGrades };
        break;
      case "teacher":
        const teacherSubjects = await prisma.subject.findMany({
          select: { id: true, name: true },
        });
        relatedData = { subjects: teacherSubjects };
        break;
      case "student":
        const studentGrades = await prisma.grade.findMany({
          select: { id: true, level: true },
        });
        const studentClasses = await prisma.class.findMany({
          include: { _count: { select: { students: true } } },
        });
        relatedData = { classes: studentClasses, grades: studentGrades };
        break;
      case "exam":
        const lessonsQuery = role === "teacher" 
        ? { teacherId: currentUserId! }
        : {};

      const examLessons = await prisma.lesson.findMany({
        where: lessonsQuery,
          select: { id: true, name: true },
        });
        relatedData = { lessons: examLessons };
        break;
        case "lesson":
          const lessonSubjects = await prisma.subject.findMany({
            select: { id: true, name: true },
          });
          const lessonClasses = await prisma.class.findMany({
            select: { id: true, name: true },
          });
          const lessonTeachers = await prisma.teacher.findMany({
            select: { id: true, name: true, surname: true },
          });
          relatedData = { 
            subjects: lessonSubjects, 
            classes: lessonClasses, 
            teachers: lessonTeachers 
          };
          break;
        case "parent":
          const parentStudents = await prisma.student.findMany({
            select: { id: true, name: true, surname: true },
          });
          relatedData = { students: parentStudents };
          break;
        case "assignment":
          const assignmentLessonsQuery = role === "teacher" 
          ? { teacherId: currentUserId! }
          : {};

        const assignmentLessons = await prisma.lesson.findMany({
          where: assignmentLessonsQuery,
            select: { id: true, name: true },
          });
          relatedData = { lessons: assignmentLessons };
          break;
        case "result":
          const currentDate = new Date();
        
          // Filter exams based on role and only show current/future exams
          const examQuery = role === "teacher" 
          ? {
              lesson: {
                teacherId: currentUserId!,
              },
              startTime: {
                gte: new Date(currentDate.getTime() - 7 * 24 * 60 * 60 * 1000), // Allow exams from last 7 days
              }
            }
          : {
              startTime: {
                gte: new Date(currentDate.getTime() - 7 * 24 * 60 * 60 * 1000), // Allow exams from last 7 days
              }
            };

        const resultExams = await prisma.exam.findMany({
          where: examQuery,
          include: { 
            lesson: { 
              include: { 
                subject: true, 
                class: true 
              } 
            } 
          },
          orderBy: {
            startTime: 'desc'
          }
        });

        // Filter assignments for teachers
        const assignmentQuery = role === "teacher" 
          ? {
              lesson: {
                teacherId: currentUserId!,
              }
            }
          : {};

        const resultAssignments = await prisma.assignment.findMany({
          where: assignmentQuery,
          include: { 
            lesson: { 
              include: { 
                subject: true, 
                class: true 
              } 
            } 
          },
        });

        // Students will be filtered dynamically based on selected exam/assignment
        relatedData = {
          students: [], // Will be populated dynamically
          exams: resultExams,
          assignments: resultAssignments,
          };
          break;
        
        case "event":
          const eventClassesQuery = role === "teacher" 
          ? {
              lessons: {
                some: {
                  teacherId: currentUserId!,
                },
              },
            }
          : {};

        const eventClasses = await prisma.class.findMany({
          where: eventClassesQuery,
            select: { id: true, name: true },
          });
          relatedData = { classes: eventClasses };
          break;
        case "announcement":
          const announcementClasses = await prisma.class.findMany({
            select: { id: true, name: true },
          });
          relatedData = { classes: announcementClasses };
          break;

      default:
        break;
    }
  }

  return (
    <div className="">
      <FormModal
        table={table}
        type={type}
        data={data}
        id={id}
        relatedData={relatedData}
      />
    </div>
  );
};

export default FormContainer;
