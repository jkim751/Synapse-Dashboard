import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { updateLesson, updateRecurringLesson } from '@/lib/actions';

export async function POST(req: NextRequest) {
  try {
    const { userId, sessionClaims } = await auth();
    const role = (sessionClaims?.metadata as { role?: string })?.role;

    if (!userId || !['admin', 'director', 'teacher', 'teacher-admin'].includes(role || '')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { lessonId, recurringLessonId, startTime, endTime, scope, originalDate } = await req.json();

    if (!startTime || !endTime) {
      return NextResponse.json({ error: 'Missing startTime or endTime' }, { status: 400 });
    }

    let result;

    if (recurringLessonId) {
      if (!scope) {
        return NextResponse.json({ error: 'scope required for recurring lessons' }, { status: 400 });
      }
      result = await updateRecurringLesson({
        id: Number(recurringLessonId),
        startTime,
        endTime,
        updateScope: scope,
        originalDate: scope === 'instance' ? originalDate : undefined,
      });
    } else if (lessonId) {
      result = await updateLesson({
        id: Number(lessonId),
        startTime,
        endTime,
      });
    } else {
      return NextResponse.json({ error: 'lessonId or recurringLessonId required' }, { status: 400 });
    }

    if (!result.success) {
      return NextResponse.json({ error: result.message || 'Update failed' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: result.message });
  } catch (error) {
    console.error('Error rescheduling lesson:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
