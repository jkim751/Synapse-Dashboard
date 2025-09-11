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
  let examsWhereClause = {};
  let assignmentsWhereClause = {};

  if (type && id) {
    // Specific teacher or class view
    const clause = type === "teacherId"
      ? { teacherId: id as string }
      : { classId: id as number };
    lessonsWhereClause = clause;
    recurringLessonsWhereClause = clause;
    
    // For exams and assignments, check both lesson and recurringLesson relationships
    if (type === "teacherId") {
      examsWhereClause = {
        OR: [
          { lesson: { teacherId: id as string } },
          { recurringLesson: { teacherId: id as string } }
        ]
      };
      assignmentsWhereClause = {
        OR: [
          { lesson: { teacherId: id as string } },
          { recurringLesson: { teacherId: id as string } }
        ]
      };
    } else {
      examsWhereClause = {
        OR: [
          { lesson: { classId: id as number } },
          { recurringLesson: { classId: id as number } }
        ]
      };
      assignmentsWhereClause = {
        OR: [
          { lesson: { classId: id as number } },
          { recurringLesson: { classId: id as number } }
        ]
      };
    }
  } else if (classIds && classIds.length > 0) {
    // Multiple classes (for students/parents)
    const clause = { classId: { in: classIds } };
    lessonsWhereClause = clause;
    recurringLessonsWhereClause = clause;
    examsWhereClause = {
      OR: [
        { lesson: { classId: { in: classIds } } },
        { recurringLesson: { classId: { in: classIds } } }
      ]
    };
    assignmentsWhereClause = {
      OR: [
        { lesson: { classId: { in: classIds } } },
        { recurringLesson: { classId: { in: classIds } } }
      ]
    };
  } else if (role !== "admin") {
    // Non-admin users should see their relevant lessons only
    if (role === "teacher") {
      const clause = { teacherId: userId! };
      lessonsWhereClause = clause;
      recurringLessonsWhereClause = clause;
      examsWhereClause = {
        OR: [
          { lesson: { teacherId: userId! } },
          { recurringLesson: { teacherId: userId! } }
        ]
      };
      assignmentsWhereClause = {
        OR: [
          { lesson: { teacherId: userId! } },
          { recurringLesson: { teacherId: userId! } }
        ]
      };
    } else if (role === "student") {
      const studentClasses = await prisma.studentClass.findMany({
        where: { studentId: userId! },
        select: { classId: true },
      });
      const studentClassIds = studentClasses.map(sc => sc.classId);
      const clause = { classId: { in: studentClassIds } };
      lessonsWhereClause = clause;
      recurringLessonsWhereClause = clause;
      examsWhereClause = {
        OR: [
          { lesson: { classId: { in: studentClassIds } } },
          { recurringLesson: { classId: { in: studentClassIds } } }
        ]
      };
      assignmentsWhereClause = {
        OR: [
          { lesson: { classId: { in: studentClassIds } } },
          { recurringLesson: { classId: { in: studentClassIds } } }
        ]
      };
    } else if (role === "parent") {
      const parentClasses = await prisma.studentClass.findMany({
        where: { student: { parentId: userId! } },
        select: { classId: true },
      });
      const parentClassIds = parentClasses.map(sc => sc.classId);
      const clause = { classId: { in: parentClassIds } };
      lessonsWhereClause = clause;
      recurringLessonsWhereClause = clause;
      examsWhereClause = {
        OR: [
          { lesson: { classId: { in: parentClassIds } } },
          { recurringLesson: { classId: { in: parentClassIds } } }
        ]
      };
      assignmentsWhereClause = {
        OR: [
          { lesson: { classId: { in: parentClassIds } } },
          { recurringLesson: { classId: { in: parentClassIds } } }
        ]
      };
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

  // Fetch all data in parallel
  const [
    lessonsRes,
    recurringLessonsRes,
    exceptionsRes,
    eventsRes,
    examsRes,
    assignmentsRes
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
        users: { select: { id: true } },
        grades: { select: { id: true } },
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
          const classIds = student.classes.map(c => c.classId);
          if (classIds.length > 0) {
            userSpecificClauses.push({ classId: { in: classIds } });
          }
        }
      } else if (role === "parent") {
        const child = await prisma.student.findFirst({
          where: { parentId: userId },
          select: { id: true, gradeId: true, classes: { select: { classId: true } } },
        });
        if (child) {
          userSpecificClauses.push({ eventUsers: { some: { userId: child.id } } }); // For their child
          if (child.gradeId) {
            userSpecificClauses.push({ eventGrades: { some: { gradeId: child.gradeId } } });
          }
          const classIds = child.classes.map(c => c.classId);
          if (classIds.length > 0) {
            userSpecificClauses.push({ classId: { in: classIds } });
          }
        }
      } else if (role === "teacher") {
        const teacher = await prisma.teacher.findUnique({
          where: { id: userId },
          select: { id: true }
        });
        if (teacher) {
          // Teachers can see events for everyone, but not grade-specific events
          // unless you have a different relationship structure
        }
      }
      
      return prisma.event.findMany({
        where: { OR: userSpecificClauses },
        include: includeClause,
      });
    })(),

    // Fetch exams - exclude for admins
    role === "admin" ? Promise.resolve([]) : prisma.exam.findMany({
      where: examsWhereClause,
      include: {
        lesson: {
          include: {
            subject: true,
            class: true,
            teacher: true,
          }
        },
        recurringLesson: {
          include: {
            subject: true,
            class: true,
            teacher: true,
          }
        }
      }
    }),

    // Fetch assignments - exclude for admins
    role === "admin" ? Promise.resolve([]) : prisma.assignment.findMany({
      where: assignmentsWhereClause,
      include: {
        lesson: {
          include: {
            subject: true,
            class: true,
            teacher: true,
          }
        },
        recurringLesson: {
          include: {
            subject: true,
            class: true,
            teacher: true,
          }
        }
      }
    })
  ]);

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
            recurringLesson.startTime.getUTCHours(),
            recurringLesson.startTime.getUTCMinutes(),
            0, 0
          );
          
          const end = new Date(occurrenceDate);
          end.setHours(
            recurringLesson.endTime.getUTCHours(),
            recurringLesson.endTime.getUTCMinutes(),
            0, 0
          );

          recurringLessonInstances.push({
            title: `${recurringLesson.name}`,
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
  const eventsData = eventsRes.map((event: any) => ({
    title: event.title,
    start: new Date(event.startTime),
    end: new Date(event.endTime),
    subject: undefined,
    teacher: undefined,
    classroom: undefined, // Remove classroom for events
    description: event.description || `${event.title} event`,
    eventId: event.id,
    type: 'event' as const,
    // Pass the complete data to the calendar event object
    id: event.id,
    classId: event.classId,
    userIds: event.users.map((u: { id: string }) => u.id),
    gradeIds: event.grades.map((g: { id: number }) => g.id),
  }));

  // Transform exams data
  const examsData = examsRes.map(exam => {
    const lessonData = exam.lesson || exam.recurringLesson;
    return {
      title: `📝 ${exam.title}`,
      start: exam.startTime,
      end: exam.endTime,
      subject: lessonData?.subject?.name,
      teacher: lessonData?.teacher ? `${lessonData.teacher.name} ${lessonData.teacher.surname}` : "",
      classroom: lessonData?.class?.name,
      description: `Exam: ${exam.title}`,
      examId: exam.id,
      type: 'exam' as const,
    };
  });

  // Transform assignments data
  const assignmentsData = assignmentsRes.map(assignment => {
    const lessonData = assignment.lesson || assignment.recurringLesson;
    return {
      title: `📋 ${assignment.title}`,
      start: assignment.dueDate,
      end: new Date(assignment.dueDate.getTime() + 60 * 60 * 1000), // 1 hour duration
      subject: lessonData?.subject?.name,
      teacher: lessonData?.teacher ? `${lessonData.teacher.name} ${lessonData.teacher.surname}` : "",
      classroom: lessonData?.class?.name,
      description: `Assignment due: ${assignment.title}`,
      assignmentId: assignment.id,
      type: 'assignment' as const,
    };
  });

  // Combine all lesson events (regular + recurring instances)
  const allLessons = [
    ...lessonsData, 
    ...recurringLessonInstances,
    ...examsData,
    ...assignmentsData
  ];

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