import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import BigCalendar from "./BigCalender";
import { RRule } from 'rrule';

const BigCalendarContainer = async ({
  type,
  id,
  classIds,
  showNotifications = false,
}: {
  type?: "teacherId" | "classId";
  id?: string | number;
  classIds?: number[];
  showNotifications?: boolean;
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
  } else if (role !== "admin") {
    // Non-admin users should see their relevant lessons only
    if (role === "teacher") {
      const clause = { teacherId: userId! };
      lessonsWhereClause = clause;
      recurringLessonsWhereClause = clause;
    } else if (role === "student") {
      const studentClasses = await prisma.studentClass.findMany({
        where: { studentId: userId! },
        select: { classId: true },
      });
      const studentClassIds = studentClasses.map(sc => sc.classId);
      const clause = { classId: { in: studentClassIds } };
      lessonsWhereClause = clause;
      recurringLessonsWhereClause = clause;
    } else if (role === "parent") {
      const parentClasses = await prisma.studentClass.findMany({
        where: { student: { parentId: userId! } },
        select: { classId: true },
      });
      const parentClassIds = parentClasses.map(sc => sc.classId);
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

  // Fetch regular lessons (no date restriction for past/future viewing)
  const lessonsRes = await prisma.lesson.findMany({
    where: {
      ...lessonsWhereClause,
      recurringLessonId: null, // Only non-recurring lessons
    },
    include: {
      subject: true,
      teacher: true,
      class: true,
    },
  });

  // Fetch recurring lesson templates
  const recurringLessonsRes = await prisma.recurringLesson.findMany({
    where: recurringLessonsWhereClause,
    include: {
      subject: true,
      teacher: true,
      class: true,
    },
  });

  // Fetch lesson exceptions (overrides/cancellations) within expansion range
  const exceptionsRes = await prisma.lesson.findMany({
    where: {
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
  });

  // Generate recurring lesson instances
  const recurringLessonInstances = [];
  const allExceptions = new Map<string, any>();

  // Map exceptions by their occurrence key
  for (const exception of exceptionsRes) {
    const exceptionKey = `${exception.recurringLessonId}-${exception.startTime.toISOString().slice(0, 10)}`;
    allExceptions.set(exceptionKey, exception);
  }

  // Expand recurring lessons within the expansion range
  for (const recurringLesson of recurringLessonsRes) {
    try {
      const rrule = RRule.fromString(recurringLesson.rrule);
      const occurrences = rrule.between(expansionStart, expansionEnd);

      for (const occurrenceDate of occurrences) {
        const occurrenceKey = `${recurringLesson.id}-${occurrenceDate.toISOString().slice(0, 10)}`;
        
        // Check if this occurrence has an exception
        const exception = allExceptions.get(occurrenceKey);
        
        if (exception) {
          if (exception.isCancelled) {
            // Skip cancelled occurrences
            continue;
          } else {
            // Use exception data for modified occurrences
            recurringLessonInstances.push({
              title: `${exception.subject?.name || recurringLesson.subject?.name || 'Unknown Subject'} - ${exception.name}`,
              start: new Date(exception.startTime),
              end: new Date(exception.endTime),
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
          // Use recurring lesson template data with actual occurrence date
          const start = new Date(occurrenceDate);
          start.setHours(
            recurringLesson.startTime.getHours(),
            recurringLesson.startTime.getMinutes(),
            0, 0
          );
          
          const end = new Date(occurrenceDate);
          end.setHours(
            recurringLesson.endTime.getHours(),
            recurringLesson.endTime.getMinutes(),
            0, 0
          );

          recurringLessonInstances.push({
            title: `${recurringLesson.subject?.name || 'Unknown Subject'} - ${recurringLesson.name}`,
            start,
            end,
            subject: recurringLesson.subject?.name,
            teacher: recurringLesson.teacher ? `${recurringLesson.teacher.name} ${recurringLesson.teacher.surname}` : 'Unknown Teacher',
            classroom: recurringLesson.class?.name || 'Unknown Classroom',
            description: `${recurringLesson.subject?.name || 'Unknown Subject'} lesson with ${recurringLesson.teacher ? `${recurringLesson.teacher.name} ${recurringLesson.teacher.surname}` : 'Unknown Teacher'}`,
            lessonId: undefined, // No specific lesson ID for template instances
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

  // Build the where clause for events based on role
  let eventsWhereClause = {};
  if (role !== "admin") {
    if (role === "student") {
      const studentClasses = await prisma.studentClass.findMany({
        where: { studentId: userId! },
        select: { classId: true },
      });
      const studentClassIds = studentClasses.map(sc => sc.classId);
      eventsWhereClause = {
        OR: [
          { classId: null },
          { classId: { in: studentClassIds } }
        ]
      };
    } else if (role === "teacher") {
      const teacherClasses = await prisma.class.findMany({
        where: { lessons: { some: { teacherId: userId! } } },
        select: { id: true },
      });
      const teacherClassIds = teacherClasses.map(c => c.id);
      eventsWhereClause = {
        OR: [
          { classId: null },
          { classId: { in: teacherClassIds } }
        ]
      };
    } else if (role === "parent") {
      const parentClasses = await prisma.studentClass.findMany({
        where: { student: { parentId: userId! } },
        select: { classId: true },
      });
      const parentClassIds = parentClasses.map(sc => sc.classId);
      eventsWhereClause = {
        OR: [
          { classId: null },
          { classId: { in: parentClassIds } }
        ]
      };
    } else {
      eventsWhereClause = { classId: null };
    }
  }

  // Fetch events (no date restriction for past/future viewing)
  const eventsRes = await prisma.event.findMany({
    where: eventsWhereClause,
    include: {
      class: true,
    },
  });

  // Transform regular lessons data (keep original dates)
  const lessonsData = lessonsRes.map((lesson) => ({
    title: `${lesson.subject?.name || 'Unknown Subject'} - ${lesson.name}`,
    start: new Date(lesson.startTime),
    end: new Date(lesson.endTime),
    subject: lesson.subject?.name,
    teacher: lesson.teacher ? `${lesson.teacher.name} ${lesson.teacher.surname}` : 'Unknown Teacher',
    classroom: lesson.class?.name || 'Unknown Classroom',
    description: `${lesson.subject?.name || 'Unknown Subject'} lesson with ${lesson.teacher ? `${lesson.teacher.name} ${lesson.teacher.surname}` : 'Unknown Teacher'}`,
    lessonId: lesson.id,
    type: 'lesson' as const,
    isRecurring: false,
  }));

  // Transform events data (keep original dates)
  const eventsData = eventsRes.map((event) => ({
    title: event.title,
    start: new Date(event.startTime),
    end: new Date(event.endTime),
    subject: undefined,
    teacher: undefined,
    classroom: event.class?.name || 'School Wide',
    description: event.description || `${event.title} event`,
    eventId: event.id,
    type: 'event' as const,
  }));

  // Combine all lessons (regular + recurring instances) without date adjustment
  const allLessons = [...lessonsData, ...recurringLessonInstances];

  return (
    <div className="h-full overflow-hidden">
      <BigCalendar
        initialLessons={allLessons}
        initialEvents={eventsData}
        showNotifications={showNotifications}
      />
    </div>
  );
};

export default BigCalendarContainer;