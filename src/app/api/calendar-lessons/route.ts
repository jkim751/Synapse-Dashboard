// app/api/calendar-lessons/route.ts
import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { RRule } from 'rrule';

export async function GET(request: Request) {
  try {
    const { userId, sessionClaims } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const role = (sessionClaims?.metadata as { role?: string })?.role;
    const { searchParams } = new URL(request.url);
    
    // Get the visible date range from the calendar's query parameters
    const viewStart = new Date(searchParams.get('start')!);
    const viewEnd = new Date(searchParams.get('end')!);

    // Build user-based filters
    const userFilter = role === "teacher" ? { teacherId: userId } : {};

    // --- 1. Fetch one-off lessons (not part of any recurring series) ---
    const singleLessons = await prisma.lesson.findMany({
      where: {
        ...userFilter,
        recurringLessonId: null,
        startTime: { gte: viewStart },
        endTime: { lte: viewEnd },
      },
      include: { subject: true, class: true, teacher: true }
    });

    // --- 2. Fetch all recurring rules ---
    const recurringRules = await prisma.recurringLesson.findMany({
      where: userFilter,
      include: { subject: true, class: true, teacher: true }
    });
    
    // --- 3. Fetch all EXCEPTIONS within the date range ---
    const exceptions = await prisma.lesson.findMany({
      where: {
        ...userFilter,
        NOT: { recurringLessonId: null },
        startTime: { gte: viewStart },
        endTime: { lte: viewEnd },
      },
      include: { subject: true, class: true, teacher: true }
    });
    
    const allCalendarEvents = new Map<string, any>();

    // --- 4. Expand recurring rules into individual occurrences ---
    for (const rule of recurringRules) {
      try {
        const rrule = RRule.fromString(rule.rrule);
        const occurrences = rrule.between(viewStart, viewEnd, true); // inclusive

        for (const occurrenceDate of occurrences) {
          // Create a unique key for each occurrence: `recurringLessonId-YYYY-MM-DD`
          const occurrenceKey = `${rule.id}-${occurrenceDate.toISOString().slice(0, 10)}`;
          
          // Calculate the duration of the original lesson
          const originalDuration = rule.endTime.getTime() - rule.startTime.getTime();
          
          // Set the start time to the occurrence date with the same time as the original
          const start = new Date(occurrenceDate);
          start.setHours(rule.startTime.getHours(), rule.startTime.getMinutes(), 0, 0);
          
          // Calculate end time by adding the original duration
          const end = new Date(start.getTime() + originalDuration);

          allCalendarEvents.set(occurrenceKey, {
            title: rule.name,
            start,
            end,
            subject: rule.subject.name,
            classroom: rule.class.name,
            teacher: `${rule.teacher.name} ${rule.teacher.surname}`,
            type: 'lesson',
            recurringLessonId: rule.id,
            isRecurring: true,
          });
        }
      } catch (rruleError) {
        console.error(`Error parsing RRule for recurring lesson ${rule.id}:`, rruleError);
        // Continue with other rules even if one fails
      }
    }
    
    // --- 5. Apply the exceptions on top of the generated occurrences ---
    for (const exception of exceptions) {
      const exceptionKey = `${exception.recurringLessonId}-${exception.startTime.toISOString().slice(0, 10)}`;
      
      if (exception.isCancelled) {
        // If it's a cancellation, remove it from the map
        allCalendarEvents.delete(exceptionKey);
      } else {
        // If it's a modification, overwrite the original with the exception's data
        allCalendarEvents.set(exceptionKey, {
          title: exception.name,
          start: exception.startTime,
          end: exception.endTime,
          subject: exception.subject?.name || "Modified Subject",
          classroom: exception.class?.name || "Modified Class",
          teacher: exception.teacher ? `${exception.teacher.name} ${exception.teacher.surname}` : "Modified Teacher",
          type: 'lesson',
          lessonId: exception.id,
          isRecurring: false,
        });
      }
    }

    // --- 6. Format single lessons ---
    const formattedSingleLessons = singleLessons.map(l => ({
      title: l.name,
      start: l.startTime,
      end: l.endTime,
      subject: l.subject?.name,
      classroom: l.class?.name,
      teacher: l.teacher ? `${l.teacher.name} ${l.teacher.surname}` : '',
      type: 'lesson',
      lessonId: l.id,
      isRecurring: false,
    }));
    
    const finalEvents = [...Array.from(allCalendarEvents.values()), ...formattedSingleLessons];

    return NextResponse.json(finalEvents);
  } catch (error: any) {
    console.error('Error fetching calendar lessons:', error);
    return NextResponse.json(
      { error: 'Failed to fetch calendar lessons' }, 
      { status: 500 }
    );
  }
}