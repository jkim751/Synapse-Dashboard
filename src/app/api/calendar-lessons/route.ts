// app/api/calendar-lessons/route.ts
import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { RRule } from 'rrule';
import { revalidatePath } from 'next/cache';

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

    // Helper: stable local date key (avoids UTC shift duplicates)
    const localDateKey = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };

    // --- 4. Expand recurring rules into individual occurrences ---
    for (const rule of recurringRules) {
      try {
        const rrule = RRule.fromString(rule.rrule);
        const occurrences = rrule.between(viewStart, viewEnd, true); // inclusive

        for (const occurrenceDate of occurrences) {
          // Clone date and apply series time in local time
          const start = new Date(occurrenceDate);
          start.setHours(rule.startTime.getHours(), rule.startTime.getMinutes(), 0, 0);
          const originalDuration = rule.endTime.getTime() - rule.startTime.getTime();
          const end = new Date(start.getTime() + originalDuration);

          const occurrenceKey = `${rule.id}-${localDateKey(start)}`;

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
      const exStart = new Date(exception.startTime);
      const exceptionKey = `${exception.recurringLessonId}-${localDateKey(exStart)}`;
      
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
    const formattedSingleLessons = singleLessons.map((l: { name: any; startTime: any; endTime: any; subject: { name: any; }; class: { name: any; }; teacher: { name: any; surname: any; }; id: any; }) => ({
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

export async function PATCH(request: Request) {
  try {
    const { userId, sessionClaims } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const role = (sessionClaims?.metadata as { role?: string })?.role;

    const body = await request.json();
    const { kind, lessonId, recurringLessonId, originalDate, start, end } = body || {};

    if (!start || !end) {
      return NextResponse.json({ error: 'Missing start/end' }, { status: 400 });
    }

    const startDate = new Date(start);
    const endDate = new Date(end);
    const dayNames = ["SUNDAY","MONDAY","TUESDAY","WEDNESDAY","THURSDAY","FRIDAY","SATURDAY"] as const;
    const dayOfWeek = dayNames[startDate.getDay()];

    // Helper for authorization for lessons
    const ensureCanEditLesson = async (teacherId: string) => {
      if (role === 'admin') return true;
      if (role === 'teacher' && teacherId === userId) return true;
      throw new Error("Forbidden");
    };

    // 1) Single lesson or existing exception
    if (kind === "single" && lessonId) {
      const existing = await prisma.lesson.findUnique({
        where: { id: Number(lessonId) },
        select: { id: true, teacherId: true, subject: { select: { name: true } }, class: { select: { name: true } }, teacher: { select: { name: true, surname: true } } }
      });
      if (!existing) return NextResponse.json({ error: "Lesson not found" }, { status: 404 });

      await ensureCanEditLesson(existing.teacherId);

      const updated = await prisma.lesson.update({
        where: { id: Number(lessonId) },
        data: {
          startTime: startDate,
          endTime: endDate,
          day: dayOfWeek,
        },
        include: { subject: true, class: true, teacher: true }
      });

      revalidatePath("/list/lessons");

      return NextResponse.json({
        success: true,
        updatedEvent: {
          title: updated.name,
          start: updated.startTime,
          end: updated.endTime,
          subject: updated.subject?.name,
          classroom: updated.class?.name,
          teacher: updated.teacher ? `${updated.teacher.name} ${updated.teacher.surname}` : '',
          type: 'lesson',
          lessonId: updated.id,
          isRecurring: false,
        }
      });
    }

    // 2) Recurring occurrence (copy-on-write exception)
    if (kind === "recurringInstance" && recurringLessonId && originalDate) {
      const series = await prisma.recurringLesson.findUnique({
        where: { id: Number(recurringLessonId) },
        include: { subject: true, class: true, teacher: true }
      });
      if (!series) return NextResponse.json({ error: "Recurring series not found" }, { status: 404 });

      await ensureCanEditLesson(series.teacherId);

      // Determine if an exception already exists for that date
      const orig = new Date(originalDate);
      const dayStart = new Date(Date.UTC(orig.getUTCFullYear(), orig.getUTCMonth(), orig.getUTCDate(), 0, 0, 0));
      const dayEnd = new Date(Date.UTC(orig.getUTCFullYear(), orig.getUTCMonth(), orig.getUTCDate(), 23, 59, 59, 999));

      const existingException = await prisma.lesson.findFirst({
        where: {
          recurringLessonId: Number(recurringLessonId),
          startTime: {
            gte: dayStart,
            lte: dayEnd,
          },
        },
        include: { subject: true, class: true, teacher: true }
      });

      let exception;
      if (existingException) {
        exception = await prisma.lesson.update({
          where: { id: existingException.id },
          data: {
            startTime: startDate,
            endTime: endDate,
            day: dayOfWeek,
          },
          include: { subject: true, class: true, teacher: true }
        });
      } else {
        exception = await prisma.lesson.create({
          data: {
            name: series.name,
            subjectId: series.subjectId,
            classId: series.classId,
            teacherId: series.teacherId,
            startTime: startDate,
            endTime: endDate,
            day: dayOfWeek,
            recurringLessonId: series.id,
          },
          include: { subject: true, class: true, teacher: true }
        });
      }

      revalidatePath("/list/lessons");

      return NextResponse.json({
        success: true,
        updatedEvent: {
          title: exception.name,
          start: exception.startTime,
          end: exception.endTime,
          subject: exception.subject?.name,
          classroom: exception.class?.name,
          teacher: exception.teacher ? `${exception.teacher.name} ${exception.teacher.surname}` : '',
          type: 'lesson',
          lessonId: exception.id,
          isRecurring: false,
        }
      });
    }

    // NEW: Update entire recurring series (move all future occurrences)
    if (kind === "series" && recurringLessonId && start && end) {
      const series = await prisma.recurringLesson.findUnique({
        where: { id: Number(recurringLessonId) },
        include: { subject: true, class: true, teacher: true }
      });
      if (!series) return NextResponse.json({ error: "Recurring series not found" }, { status: 404 });

      await ensureCanEditLesson(series.teacherId);

      const startDate = new Date(start);
      const endDate = new Date(end);

      // Build a new RRule with updated BYDAY while preserving other options
      let newRRuleString = series.rrule;
      try {
        const current = RRule.fromString(series.rrule);
        const weekdays = [RRule.SU, RRule.MO, RRule.TU, RRule.WE, RRule.TH, RRule.FR, RRule.SA];
        const newWeekday = weekdays[startDate.getDay()];

        const opts = { ...current.origOptions };
        opts.byweekday = [newWeekday];
        // Preserve dtstart/until if present; fallback dtstart to existing series startTime
        if (!opts.dtstart) opts.dtstart = series.startTime;
        const rebuilt = new RRule(opts);
        newRRuleString = rebuilt.toString();
      } catch (e) {
        console.warn("Failed to rebuild RRule, keeping original:", e);
      }

      const updatedSeries = await prisma.recurringLesson.update({
        where: { id: Number(recurringLessonId) },
        data: {
          startTime: startDate,
          endTime: endDate,
          rrule: newRRuleString,
        },
        include: { subject: true, class: true, teacher: true }
      });

      // Revalidate lessons list so the page reflects the series changes
      revalidatePath("/list/lessons");

      // Return an updatedEvent shaped for client optimistic update of the dropped occurrence
      return NextResponse.json({
        success: true,
        updatedEvent: {
          title: updatedSeries.name,
          start: startDate,
          end: endDate,
          subject: updatedSeries.subject?.name,
          classroom: updatedSeries.class?.name,
          teacher: updatedSeries.teacher ? `${updatedSeries.teacher.name} ${updatedSeries.teacher.surname}` : '',
          type: 'lesson',
          recurringLessonId: updatedSeries.id,
          isRecurring: true,
        }
      });
    }

    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  } catch (error: any) {
    if (error?.message === "Forbidden") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    console.error("PATCH /api/calendar-lessons error:", error);
    return NextResponse.json({ error: "Failed to update lesson" }, { status: 500 });
  }
}