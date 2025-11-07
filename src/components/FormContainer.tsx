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
        // Only teachers and students should see exams, not admins
        if (role === "admin") {
          relatedData = { singleLessons: [], recurringLessons: [] };
          break;
        }

        let examLessonsQuery: any = {};
        
        if (role === "teacher") {
          examLessonsQuery = { teacherId: currentUserId! };
        } else if (role === "student") {
          // For students, only show lessons from classes they're enrolled in
          const studentClasses = await prisma.student.findUnique({
            where: { id: currentUserId! },
            include: {
              classes: {
                select: { classId: true }
              }
            }
          });

          if (studentClasses?.classes.length) {
            examLessonsQuery = {
              classId: {
                in: studentClasses.classes.map((sc: { classId: any; }) => sc.classId)
              }
            };
          } else {
            // Student not enrolled in any classes
            relatedData = { singleLessons: [], recurringLessons: [] };
            break;
          }
        }

        const singleLessons = await prisma.lesson.findMany({
          where: { ...examLessonsQuery, recurringLessonId: null },
          select: { id: true, name: true },
        });

        const recurringLessons = await prisma.recurringLesson.findMany({
          where: examLessonsQuery,
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

      case "assignment":
        // Only teachers and students should see assignments, not admins
        if (role === "admin") {
          relatedData = { singleLessons: [], recurringLessons: [] };
          break;
        }

        let assignmentLessonsQuery: any = {};
        
        if (role === "teacher") {
          assignmentLessonsQuery = { teacherId: currentUserId! };
        } else if (role === "student") {
          // For students, only show lessons from classes they're enrolled in
          const studentClasses = await prisma.student.findUnique({
            where: { id: currentUserId! },
            include: {
              classes: {
                select: { classId: true }
              }
            }
          });

          if (studentClasses?.classes.length) {
            assignmentLessonsQuery = {
              classId: {
                in: studentClasses.classes.map((sc: { classId: any; }) => sc.classId)
              }
            };
          } else {
            // Student not enrolled in any classes
            relatedData = { singleLessons: [], recurringLessons: [] };
            break;
          }
        }

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
        // Only teachers should create results, not admins or students
        if (role === "admin" || role === "student") {
          relatedData = { students: [], exams: [], assignments: [] };
          break;
        }

        const currentDate = new Date();

        // Only teachers can create results - filter exams for their lessons only
        const examQuery = {
          startTime: {
            gte: new Date(currentDate.getTime() - 7 * 24 * 60 * 60 * 1000), // Allow exams from last 7 days
          },
          OR: [
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
          ]
        };

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

        // Filter assignments for the teacher only
        const assignmentQuery = {
          OR: [
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
          ]
        };

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