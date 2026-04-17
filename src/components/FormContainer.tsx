import prisma from "@/lib/prisma";
import FormModal from "./FormModal";
import { auth, clerkClient } from "@clerk/nextjs/server";

export type FormContainerProps = {
  table:
  | "teacher"
  | "student"
  | "parent"
  | "subject"
  | "class"
  | "lesson"
  | "recurringLesson"
  | "assessment"
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
        if (type === "update" && id) {
          const clerk = await clerkClient();
          const clerkUser = await clerk.users.getUser(id as string);
          const currentRole = (clerkUser.publicMetadata?.role as string) || "admin";
          relatedData = { currentRole };
        }
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

      case "assessment": {
        let assessmentLessonsQuery: any = {};

        if (role === "teacher") {
          assessmentLessonsQuery = { teacherId: currentUserId! };
        } else if (role === "student") {
          const studentClasses = await prisma.student.findUnique({
            where: { id: currentUserId! },
            include: { classes: { select: { classId: true } } },
          });
          if (studentClasses?.classes.length) {
            assessmentLessonsQuery = { classId: { in: studentClasses.classes.map((sc: any) => sc.classId) } };
          } else {
            relatedData = { singleLessons: [], recurringLessons: [] };
            break;
          }
        }

        const singleLessons = await prisma.lesson.findMany({
          where: { ...assessmentLessonsQuery, recurringLessonId: null, isMakeup: false },
          select: { id: true, name: true },
        });
        const recurringLessons = await prisma.recurringLesson.findMany({
          where: assessmentLessonsQuery,
          select: { id: true, name: true },
        });
        relatedData = { singleLessons, recurringLessons };
        break;
      }

      case "lesson": {
        const [subjects, classes, teachers] = await Promise.all([
          prisma.subject.findMany({ select: { id: true, name: true } }),
          prisma.class.findMany({ select: { id: true, name: true } }),
          prisma.teacher.findMany({ select: { id: true, name: true, surname: true } }),
        ]);

        // Always fetch lesson data when updating, regardless of what's in data prop
        if (type === "update" && id) {
          const lessonData = await prisma.lesson.findUnique({
            where: { id: Number(id) },
            include: { 
              subject: true,
              class: true,
              teacher: true,
            },
          });
          console.log("Fetched lesson data for form:", lessonData);
          // Reassign data variable
          data = lessonData;
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

        // Always fetch recurring lesson data when updating
        if (type === "update" && id) {
          const recurringData = await prisma.recurringLesson.findUnique({
            where: { id: Number(id) },
            include: { 
              subject: true,
              class: true,
              teacher: true,
            },
          });
          console.log("Fetched recurring lesson data for form:", recurringData);
          // Reassign data variable
          data = recurringData;
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

      case "result": {
        if (role === "admin" || role === "director" || role === "teacher-admin" || role === "student") {
          relatedData = { assessments: [] };
          break;
        }

        const assessments = await prisma.assessment.findMany({
          where: {
            OR: [
              { lesson: { teacherId: currentUserId! } },
              { recurringLesson: { teacherId: currentUserId! } },
            ],
          },
          include: {
            lesson: { include: { subject: true, class: true, teacher: true } },
            recurringLesson: { include: { subject: true, class: true, teacher: true } },
          },
          orderBy: { title: "asc" },
        });

        relatedData = { assessments };
        break;
      }

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

        // Fetch teachers and admins for the new selection option
        const eventTeachers = await prisma.teacher.findMany({
          select: { id: true, name: true, surname: true },
        });

        const eventAdmins = await prisma.admin.findMany({
          select: { id: true, name: true, surname: true },
        });

        // Fetch grades for the new selection option
        const eventGrades = await prisma.grade.findMany({
          select: { id: true, level: true },
          orderBy: { level: 'asc' },
        });

        // If updating, fetch existing user and grade relationships
        if (type === "update" && id) {
          const eventWithRelations = await prisma.event.findUnique({
            where: { id: Number(id) },
            include: {
              eventUsers: {
                select: { userId: true },
              },
              eventGrades: {
                select: { gradeId: true },
              },
            },
          });

          if (data && eventWithRelations) {
            data.userIds = eventWithRelations.eventUsers.map((eu: { userId: any; }) => eu.userId);
            data.gradeIds = eventWithRelations.eventGrades.map((eg: { gradeId: any; }) => eg.gradeId);
          }
        }

        relatedData = { 
          classes: eventClasses, 
          teachers: eventTeachers,
          admins: eventAdmins,
          grades: eventGrades
        };
        break;

      case "announcement":
        const announcementClasses = await prisma.class.findMany({
          select: { id: true, name: true },
        });

        // Fetch teachers and admins for the new selection option
        const announcementTeachers = await prisma.teacher.findMany({
          select: { id: true, name: true, surname: true },
        });

        const announcementAdmins = await prisma.admin.findMany({
          select: { id: true, name: true, surname: true },
        });

        // Fetch grades for the new selection option
        const announcementGrades = await prisma.grade.findMany({
          select: { id: true, level: true },
          orderBy: { level: 'asc' },
        });

        // If updating, fetch existing user and grade relationships
        if (type === "update" && id) {
          const announcementWithRelations = await prisma.announcement.findUnique({
            where: { id: Number(id) },
            include: {
              announcementUsers: {
                select: { userId: true },
              },
              announcementGrades: {
                select: { gradeId: true },
              },
            },
          });

          if (data && announcementWithRelations) {
            data.userIds = announcementWithRelations.announcementUsers.map((au: { userId: any; }) => au.userId);
            data.gradeIds = announcementWithRelations.announcementGrades.map((ag: { gradeId: any; }) => ag.gradeId);
          }
        }

        relatedData = { 
          classes: announcementClasses, 
          teachers: announcementTeachers,
          admins: announcementAdmins,
          grades: announcementGrades
        };
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