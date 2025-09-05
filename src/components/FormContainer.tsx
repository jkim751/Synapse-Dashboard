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
  | "recurringLesson"
  | "exam"
  | "assignment"
  | "result"
  | "event"
  | "announcement"
  | "admin";
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

      case "admin":
        // No related data needed for admin form
        break;

      case "student":
        const studentGrades = await prisma.grade.findMany({
          select: { id: true, level: true },
        });

        const studentClasses = await prisma.class.findMany({
          include: {
            _count: { select: { students: true } },
            grade: true, // Include grade info for filtering
          },
        });

        const studentParents = await prisma.parent.findMany({
          select: { id: true, name: true, surname: true },
        });

        // If updating, fetch the student's current classes
        if (type === "update" && id) {
          const studentWithClasses = await prisma.student.findUnique({
            where: { id: id as string },
            include: {
              classes: {
                select: {
                  classId: true,
                  isPrimary: true,
                },
              },
            },
          });

          // Merge current classes info with the data
          if (data && studentWithClasses?.classes) {
            data.classes = studentWithClasses.classes;
          }
        }

        relatedData = {
          classes: studentClasses,
          grades: studentGrades,
          parents: studentParents,
        };
        break;

      case "exam":
        const lessonsQuery = role === "teacher" ? { teacherId: currentUserId! } : {};

        const singleLessons = await prisma.lesson.findMany({
          where: { ...lessonsQuery, recurringLessonId: null },
          select: { id: true, name: true },
        });

        const recurringLessons = await prisma.recurringLesson.findMany({
          where: lessonsQuery,
          select: { id: true, name: true },
        });

        relatedData = { singleLessons, recurringLessons };
        break;

          case "lesson": {
            const [subjects, classes, teachers] = await Promise.all([
              prisma.subject.findMany({ select: { id: true, name: true } }),
              prisma.class.findMany({ select: { id: true, name: true } }),
              prisma.teacher.findMany({ select: { id: true, name: true, surname: true } }),
            ]);
    
            if (type === "update" && id) {
              const existing = await prisma.lesson.findUnique({
                where: { id: Number(id) },
                include: { subject: true, class: true, teacher: true },
              });
              if (existing) data = existing;
            }
    
            relatedData = { subjects, classes, teachers, variant: "single" };
            break;
          }
    
          case "recurringLesson": {
            const [subjects, classes, teachers] = await Promise.all([
              prisma.subject.findMany({ select: { id: true, name: true } }),
              prisma.class.findMany({ select: { id: true, name: true } }),
              prisma.teacher.findMany({ select: { id: true, name: true, surname: true } }),
            ]);
    
            if (type === "update" && id) {
              const existing = await prisma.recurringLesson.findUnique({
                where: { id: Number(id) },
                include: { subject: true, class: true, teacher: true },
              });
              if (existing) data = existing;
            }
    
            relatedData = { subjects, classes, teachers, variant: "recurring" };
            break;
          }
      
      

      case "parent":
        const parentStudents = await prisma.student.findMany({
          select: { id: true, name: true, surname: true },
        });
        relatedData = { students: parentStudents };
        break;

      case "assignment":
        const assignmentLessonsQuery = role === "teacher" ? { teacherId: currentUserId! } : {};

        const singleLessonsForAssignment = await prisma.lesson.findMany({
          where: { ...assignmentLessonsQuery, recurringLessonId: null },
          select: { id: true, name: true },
        });

        const recurringLessonsForAssignment = await prisma.recurringLesson.findMany({
          where: assignmentLessonsQuery,
          select: { id: true, name: true },
        });

        relatedData = { singleLessons: singleLessonsForAssignment, recurringLessons: recurringLessonsForAssignment };
        console.log("[FormContainer] Fetched Related Data for Assignment:", relatedData);
        break;

      case "result":
        const currentDate = new Date();

        // Filter exams based on role and handle both lesson and recurringLesson
        let examQuery: any = {
          startTime: {
            gte: new Date(currentDate.getTime() - 7 * 24 * 60 * 60 * 1000), // Allow exams from last 7 days
          }
        };

        if (role === "teacher") {
          examQuery.OR = [
            {
              lesson: {
                teacherId: currentUserId!,
              }
            },
            {
              recurringLesson: {
                teacherId: currentUserId!,
              }
            }
          ];
        }

        const resultExams = await prisma.exam.findMany({
          where: examQuery,
          include: {
            lesson: {
              include: {
                subject: true,
                class: true,
                teacher: true
              }
            },
            recurringLesson: {
              include: {
                subject: true,
                class: true,
                teacher: true
              }
            }
          },
          orderBy: {
            startTime: 'desc'
          }
        });

        // Filter assignments for teachers - handle both lesson and recurringLesson
        let assignmentQuery: any = {};

        if (role === "teacher") {
          assignmentQuery.OR = [
            {
              lesson: {
                teacherId: currentUserId!,
              }
            },
            {
              recurringLesson: {
                teacherId: currentUserId!,
              }
            }
          ];
        }

        const resultAssignments = await prisma.assignment.findMany({
          where: assignmentQuery,
          include: {
            lesson: {
              include: {
                subject: true,
                class: true,
                teacher: true
              }
            },
            recurringLesson: {
              include: {
                subject: true,
                class: true,
                teacher: true
              }
            }
          },
          orderBy: {
            dueDate: 'desc'
          }
        });

        console.log("[FormContainer] Result exams found:", resultExams.length);
        console.log("[FormContainer] Result assignments found:", resultAssignments.length);

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
