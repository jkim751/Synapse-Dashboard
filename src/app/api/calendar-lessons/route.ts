// app/api/calendar-lessons/route.ts
import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { RRule } from 'rrule';

export async function GET(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    // Get the visible date range from the calendar's query parameters
    const viewStart = new Date(searchParams.get('start')!);
    const viewEnd = new Date(searchParams.get('end')!);

    // --- 1. Fetch one-off lessons (not part of any recurring series) ---
    const singleLessons = await prisma.lesson.findMany({
      where: {
        recurringLessonId: null, // This ensures we only get single lessons
        startTime: { gte: viewStart },
        endTime: { lte: viewEnd },
        // ... add your user-based filters here ...
      },
      include: { subject: true, class: true, teacher: true }
    });

    // --- 2. Fetch all recurring rules ---
    const recurringRules = await prisma.recurringLesson.findMany({
      where: { /* ... add your user-based filters here ... */ },
      include: { subject: true, class: true, teacher: true }
    });
    
    // --- 3. Fetch all EXCEPTIONS within the date range ---
    const exceptions = await prisma.lesson.findMany({
      where: {
        NOT: { recurringLessonId: null },
        startTime: { gte: viewStart },
        endTime: { lte: viewEnd },
      },
    });
    
    const allCalendarEvents = new Map<string, any>();

    // --- 4. Expand recurring rules into individual occurrences ---
    for (const rule of recurringRules) {
      const rrule = RRule.fromString(rule.rrule);
      const occurrences = rrule.between(viewStart, viewEnd);

      for (const occurrenceDate of occurrences) {
        // Create a unique key for each occurrence: `recurringLessonId-YYYY-MM-DD`
        const occurrenceKey = `${rule.id}-${occurrenceDate.toISOString().slice(0, 10)}`;
        
        const start = new Date(occurrenceDate);
        start.setUTCHours(rule.startTime.getUTCHours(), rule.startTime.getUTCMinutes());
        
        const end = new Date(occurrenceDate);
        end.setUTCHours(rule.endTime.getUTCHours(), rule.endTime.getUTCMinutes());

        allCalendarEvents.set(occurrenceKey, {
          title: rule.name,
          start,
          end,
          subject: rule.subject.name,
          classroom: rule.class.name,
          teacher: `${rule.teacher.name} ${rule.teacher.surname}`,
          type: 'lesson',
          // Key info for the UI to handle updates/deletes
          recurringLessonId: rule.id,
          isRecurring: true,
        });
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
          // You would need to include relations in the exception query to get these names
          subject: "Overridden Subject", 
          classroom: "Overridden Class",
          teacher: "Overridden Teacher",
          type: 'lesson',
          lessonId: exception.id, // This is now a real lesson instance ID
          isRecurring: false, // It's an exception, so it behaves like a single lesson now
        });
      }
    }

    // --- 6. Combine everything and send back to the client ---
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
    console.error('Error fetching calendar lessons:', error.message);
    
    // --- THIS IS THE FIX ---
    // We now explicitly return a NextResponse object with a 500
    // Internal Server Error status.
    return NextResponse.json(
      { error: 'Failed to fetch calendar lessons' }, 
      { status: 500 }
    );
  }
}