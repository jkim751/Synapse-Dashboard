import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import BigCalendar from "./BigCalender";
import { RRule } from 'rrule';

const BigCalendarContainer = async ({
  type,
  id,
  classIds,
  showNotifications = false,
  viewMode = "admin",
}: {
  type?: "teacherId" | "classId";
  id?: string | number;
  classIds?: number[];
  showNotifications?: boolean;
  viewMode?: "admin" | "teacher";
} = {}) => {
  const { userId, sessionClaims } = await auth();
  const role = (sessionClaims?.metadata as { role?: string })?.role;

  // Build the where clause for lessons based on the parameters
  let lessonsWhereClause = {};
  let recurringLessonsWhereClause = {};

  if (type && id) {
    // Specific teacher or class view
    const clause = type === "teacherId"
      ? { teacherId: id as string }
      : { classId: id as number };
    lessonsWhereClause = clause;
    recurringLessonsWhereClause = clause;
  } else if (classIds && classIds.length > 0) {
    // Multiple classes (for students/parents)
    const clause = { classId: { in: classIds } };
    lessonsWhereClause = clause;
    recurringLessonsWhereClause = clause;
  } else if (role === "teacher-admin" && viewMode === "teacher" && userId) {
    // Teacher-admin in teacher view: filter to their own lessons only
    const clause = { teacherId: userId };
    lessonsWhereClause = clause;
    recurringLessonsWhereClause = clause;
  } else if (role !== "admin" && role !== "director" && role !== "teacher-admin") {
    // Non-admin users should see their relevant lessons only
    if (role === "teacher" && userId) {
      const clause = { teacherId: userId };
      lessonsWhereClause = clause;
      recurringLessonsWhereClause = clause;
    } else if (role === "student" && userId) {
      const studentClasses = await prisma.studentClass.findMany({
        where: { studentId: userId },
        select: { classId: true },
      });
      const studentClassIds = studentClasses.map((sc: { classId: any; }) => sc.classId);
      const clause = { classId: { in: studentClassIds } };
      lessonsWhereClause = clause;
      recurringLessonsWhereClause = clause;
    } else if (role === "parent" && userId) {
      const parentClasses = await prisma.studentClass.findMany({
        where: { student: { parentId: userId } },
        select: { classId: true },
        distinct: ['classId'],
      });
      const parentClassIds = parentClasses.map((sc: { classId: any; }) => sc.classId);
      const clause = { classId: { in: parentClassIds } };
      lessonsWhereClause = clause;
      recurringLessonsWhereClause = clause;
    }
  }
  // Admin sees all lessons (empty where clause)

  // Expand date range for recurring lessons (6 months past and future)
  const currentDate = new Date();
  const expansionStart = new Date(currentDate);
  expansionStart.setMonth(currentDate.getMonth() - 6);
  expansionStart.setHours(0, 0, 0, 0);
  
  const expansionEnd = new Date(currentDate);
  expansionEnd.setMonth(currentDate.getMonth() + 6);
  expansionEnd.setHours(23, 59, 59, 999);

  // Convert a UTC Date to a timezone-naive Singapore time string (YYYY-MM-DDTHH:mm:ss).
  // Passing a no-Z string to the calendar makes the browser treat it as "local" time,
  // so the calendar always renders Singapore times regardless of the browser's timezone.
  const SGT_OFFSET_MS = 8 * 60 * 60 * 1000;
  const toSGTString = (date: Date): string => {
    const sgt = new Date(date.getTime() + SGT_OFFSET_MS);
    const year = sgt.getUTCFullYear();
    const month = String(sgt.getUTCMonth() + 1).padStart(2, '0');
    const day = String(sgt.getUTCDate()).padStart(2, '0');
    const hours = String(sgt.getUTCHours()).padStart(2, '0');
    const minutes = String(sgt.getUTCMinutes()).padStart(2, '0');
    const seconds = String(sgt.getUTCSeconds()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
  };

  // Fetch all data in parallel
  const [
    lessonsRes,
    recurringLessonsRes,
    exceptionsRes,
    eventsRes,
  ] = await Promise.all([
    // Fetch regular lessons (no date restriction for past/future viewing)
    prisma.lesson.findMany({
      where: {
        ...lessonsWhereClause,
        recurringLessonId: null, // Only non-recurring lessons
      },
      include: {
        subject: true,
        teacher: true,
        class: true,
      },
    }),

    // Fetch recurring lesson templates
    prisma.recurringLesson.findMany({
      where: recurringLessonsWhereClause,
      include: {
        subject: true,
        teacher: true,
        class: true,
      },
    }),

    // Fetch lesson exceptions (overrides/cancellations) within expansion range
    prisma.lesson.findMany({
      where: {
        ...lessonsWhereClause,
        NOT: { recurringLessonId: null },
        startTime: {
          gte: expansionStart,
          lte: expansionEnd
        },
      },
      include: {
        subject: true,
        teacher: true,
        class: true,
      },
    }),

    // Fetch events with role-based filtering
    (async () => {
      const includeClause = {
        class: true,
        eventUsers: { select: { userId: true } },
        eventGrades: { select: { gradeId: true } },
      };

      // Admins should not see all events on the calendar.
      // They see events for 'everyone' or events they are specifically added to.
      // The main event list page will show all events for management purposes.
      if (!userId) return [];

      const userSpecificClauses: any[] = [
        // Events for everyone
        {
          classId: null,
          AND: [
            { eventUsers: { none: {} } },
            { eventGrades: { none: {} } },
          ],
        },
        // Events specifically for the user
        { eventUsers: { some: { userId: userId } } },
      ];

      if (role === "student") {
        const student = await prisma.student.findUnique({
          where: { id: userId },
          select: { gradeId: true, classes: { select: { classId: true } } },
        });
        if (student) {
          if (student.gradeId) {
            userSpecificClauses.push({ eventGrades: { some: { gradeId: student.gradeId } } });
          }
          const classIds = student.classes.map((c: { classId: any; }) => c.classId);
          if (classIds.length > 0) {
            userSpecificClauses.push({ classId: { in: classIds } });
          }
        }
      } else if (role === "parent") {
        const children = await prisma.student.findMany({
          where: { parentId: userId },
          select: { id: true, gradeId: true, classes: { select: { classId: true } } },
        });
        for (const child of children) {
          userSpecificClauses.push({ eventUsers: { some: { userId: child.id } } });
          if (child.gradeId) {
            userSpecificClauses.push({ eventGrades: { some: { gradeId: child.gradeId } } });
          }
          const classIds = child.classes.map((c: { classId: any; }) => c.classId);
          if (classIds.length > 0) {
            userSpecificClauses.push({ classId: { in: classIds } });
          }
        }
      }
      
      return prisma.event.findMany({
        where: { OR: userSpecificClauses },
        include: includeClause,
      });
    })(),
  ]);

  // Generate recurring lesson instances
  const recurringLessonInstances = [];
  const allExceptions = new Map<string, any>();

  // Map exceptions by their occurrence key
  for (const exception of exceptionsRes) {
    const exceptionDate = new Date(exception.startTime);
    const exceptionKey = `${exception.recurringLessonId}-${exceptionDate.getFullYear()}-${String(exceptionDate.getMonth() + 1).padStart(2, '0')}-${String(exceptionDate.getDate()).padStart(2, '0')}`;
    allExceptions.set(exceptionKey, exception);
  }

  // Expand recurring lessons within the expansion range
  for (const recurringLesson of recurringLessonsRes) {
    try {
      const rrule = RRule.fromString(recurringLesson.rrule);
      const occurrences = rrule.between(expansionStart, expansionEnd);

      for (const occurrenceDate of occurrences) {
        const occKey = `${recurringLesson.id}-${occurrenceDate.getFullYear()}-${String(occurrenceDate.getMonth() + 1).padStart(2, '0')}-${String(occurrenceDate.getDate()).padStart(2, '0')}`;
        
        // Check if this occurrence has an exception
        const exception = allExceptions.get(occKey);
        
        if (exception) {
          if (exception.isCancelled) {
            continue;
          } else {
            recurringLessonInstances.push({
              title: `${exception.subject?.name || recurringLesson.subject?.name || 'Unknown Subject'} - ${exception.name}`,
              start: toSGTString(new Date(exception.startTime)),
              end: toSGTString(new Date(exception.endTime)),
              subject: exception.subject?.name || recurringLesson.subject?.name,
              teacher: exception.teacher ? `${exception.teacher.name} ${exception.teacher.surname}` : (recurringLesson.teacher ? `${recurringLesson.teacher.name} ${recurringLesson.teacher.surname}` : 'Unknown Teacher'),
              classroom: exception.class?.name || recurringLesson.class?.name || 'Unknown Classroom',
              description: `${exception.subject?.name || recurringLesson.subject?.name || 'Unknown Subject'} lesson with ${exception.teacher ? `${exception.teacher.name} ${exception.teacher.surname}` : (recurringLesson.teacher ? `${recurringLesson.teacher.name} ${recurringLesson.teacher.surname}` : 'Unknown Teacher')}`,
              lessonId: exception.id,
              type: 'lesson' as const,
              isRecurring: false,
            });
          }
        } else {
          const dbTemplateStart = new Date(recurringLesson.startTime);
          const dbTemplateEnd = new Date(recurringLesson.endTime);
          const templateHours = dbTemplateStart.getUTCHours();
          const templateMinutes = dbTemplateStart.getUTCMinutes();
          const durationMs = dbTemplateEnd.getTime() - dbTemplateStart.getTime();

          const start = new Date(Date.UTC(
            occurrenceDate.getFullYear(),
            occurrenceDate.getMonth(),
            occurrenceDate.getDate(),
            templateHours,
            templateMinutes
          ));
          
          const end = new Date(start.getTime() + durationMs);

          recurringLessonInstances.push({
            title: `${recurringLesson.name}`,
            start: toSGTString(start),
            end: toSGTString(end),
            subject: recurringLesson.subject?.name,
            teacher: recurringLesson.teacher ? `${recurringLesson.teacher.name} ${recurringLesson.teacher.surname}` : 'Unknown Teacher',
            classroom: recurringLesson.class?.name || 'Unknown Classroom',
            description: `${recurringLesson.subject?.name || 'Unknown Subject'} lesson with ${recurringLesson.teacher ? `${recurringLesson.teacher.name} ${recurringLesson.teacher.surname}` : 'Unknown Teacher'}`,
            lessonId: undefined,
            recurringLessonId: recurringLesson.id,
            type: 'lesson' as const,
            isRecurring: true,
          });
        }
      }
    } catch (error) {
      console.error(`Error expanding recurring lesson ${recurringLesson.id}:`, error);
    }
  }

  const lessonsData = lessonsRes.map((lesson: { subject: { name: any; }; name: any; startTime: string | number | Date; endTime: string | number | Date; teacher: { name: any; surname: any; }; class: { name: any; }; id: any; }) => {
    return {
      title: `${lesson.subject?.name || 'Unknown Subject'} - ${lesson.name}`,
      start: toSGTString(new Date(lesson.startTime)),
      end: toSGTString(new Date(lesson.endTime)),
      subject: lesson.subject?.name,
      teacher: lesson.teacher ? `${lesson.teacher.name} ${lesson.teacher.surname}` : 'Unknown Teacher',
      classroom: lesson.class?.name || 'Unknown Classroom',
      description: `${lesson.subject?.name || 'Unknown Subject'} lesson with ${lesson.teacher ? `${lesson.teacher.name} ${lesson.teacher.surname}` : 'Unknown Teacher'}`,
      lessonId: lesson.id,
      type: 'lesson' as const,
      isRecurring: false,
      isMakeup: (lesson as any).isMakeup ?? false,
    };
  });

  // Transform events data (keep original dates)
  const eventsData = eventsRes.map((event: any) => ({
    title: event.title,
    start: toSGTString(new Date(event.startTime)),
    end: toSGTString(new Date(event.endTime)),
    subject: undefined,
    teacher: undefined,
    classroom: undefined, // Remove classroom for events
    description: event.description || `${event.title} event`,
    eventId: event.id,
    type: 'event' as const,
    // Pass the complete data to the calendar event object
    id: event.id,
    classId: event.classId,
    userIds: event.eventUsers.map((u: { userId: string }) => u.userId),
    gradeIds: event.eventGrades.map((g: { gradeId: number }) => g.gradeId),
  }));

  // Combine all lesson events (regular + recurring instances)
  const allLessons = [
    ...lessonsData,
    ...recurringLessonInstances,
  ];

  const canDragDrop = role === 'admin' || role === 'director' || role === 'teacher' || role === 'teacher-admin';

  return (
    <div className="h-full overflow-hidden">
      <BigCalendar
        initialLessons={allLessons}
        initialEvents={eventsData}
        showNotifications={showNotifications}
        canDragDrop={canDragDrop}
      />
    </div>
  );
};

export default BigCalendarContainer;