// IT APPEARS THAT BIG CALENDAR SHOWS THE LAST WEEK WHEN THE CURRENT DAY IS A WEEKEND.
// FOR THIS REASON WE'LL GET THE LAST WEEK AS THE REFERENCE WEEK.
// IN THE TUTORIAL WE'RE TAKING THE NEXT WEEK AS THE REFERENCE WEEK.

import prisma from "./prisma";

export const adjustScheduleToCurrentWeek = (
  lessons: {
    title: string;
    start: Date;
    end: Date;
    subject?: string;
    teacher?: string;
    classroom?: string;
    description?: string;
    lessonId?: number;
  }[]
): {
  title: string;
  start: Date;
  end: Date;
  subject?: string;
  teacher?: string;
  classroom?: string;
  description?: string;
  lessonId?: number;
}[] => {
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();

  // Get the first day of current month
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1);

  // Get the last day of current month
  const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);

  // Generate events for the entire current month
  const adjustedLessons: typeof lessons = [];

  lessons.forEach((lesson) => {
    const lessonDayOfWeek = lesson.start.getDay();

    // Find all occurrences of this day of week in the current month
    for (let day = 1; day <= lastDayOfMonth.getDate(); day++) {
      const currentDate = new Date(currentYear, currentMonth, day);
      
      if (currentDate.getDay() === lessonDayOfWeek) {
        const startTime = new Date(lesson.start);
        const endTime = new Date(lesson.end);

        const newStart = new Date(
          currentYear,
          currentMonth,
          day,
          startTime.getHours(),
          startTime.getMinutes(),
          startTime.getSeconds()
        );

        const newEnd = new Date(
          currentYear,
          currentMonth,
          day,
          endTime.getHours(),
          endTime.getMinutes(),
          endTime.getSeconds()
        );

        adjustedLessons.push({
          ...lesson,
          start: newStart,
          end: newEnd,
        });
      }
    }
  });

  return adjustedLessons;
};

// Helper function to get events for a specific user
export const getEventsForUser = async (userId: string, role: string) => {
  const baseWhere: any = {
    OR: [
      // Global events (no class, no specific users, no specific grades)
      { 
        AND: [
          { classId: null },
          { eventUsers: { none: {} } },
          { eventGrades: { none: {} } }
        ]
      },
    ]
  };

  // Add role-specific conditions
  if (role === "student") {
    // Students see global events + their class events + their grade events
    const student = await prisma.student.findUnique({
      where: { id: userId },
      include: { 
        classes: true,
        grade: true
      }
    });

    if (student?.classes.length) {
      baseWhere.OR.push({
        classId: { in: student.classes.map(sc => sc.classId) }
      });
    }

    if (student?.gradeId) {
      baseWhere.OR.push({
        eventGrades: {
          some: { gradeId: student.gradeId }
        }
      });
    }
  } else if (role === "teacher" || role === "admin") {
    // Teachers/Admins see global events + events specifically assigned to them + their class events + grade events
    baseWhere.OR.push({
      eventUsers: {
        some: { userId: userId }
      }
    });

    if (role === "teacher") {
      // Teachers also see events for classes they teach and grades of those classes
      const teacherClasses = await prisma.class.findMany({
        where: {
          lessons: {
            some: { teacherId: userId }
          }
        },
        select: { id: true, gradeId: true }
      });

      if (teacherClasses.length > 0) {
        baseWhere.OR.push({
          classId: { in: teacherClasses.map(c => c.id) }
        });

        // Also include grade events for grades they teach
        const gradeIds = [...new Set(teacherClasses.map(c => c.gradeId))];
        if (gradeIds.length > 0) {
          baseWhere.OR.push({
            eventGrades: {
              some: { gradeId: { in: gradeIds } }
            }
          });
        }
      }
    }
  }

  return await prisma.event.findMany({
    where: baseWhere,
    include: {
      class: true,
      eventUsers: {
        include: {
          teacher: { select: { name: true, surname: true } },
          admin: { select: { name: true, surname: true } }
        }
      },
      eventGrades: {
        include: {
          grade: { select: { level: true } }
        }
      }
    },
    orderBy: { startTime: 'asc' }
  });
};