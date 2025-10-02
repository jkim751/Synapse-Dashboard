import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const { userId, sessionClaims } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRoles = (sessionClaims?.metadata as { roles?: string[] })?.roles || [];
    let userClassIds: number[] = [];

    // --- Get the relevant class IDs based on the user's role ---
    if (!userRoles.includes('admin')) {
      if (userRoles.includes('student')) {
        const studentClasses = await prisma.studentClass.findMany({
          where: { studentId: userId },
          select: { classId: true },
        });
        userClassIds = studentClasses.map((sc: { classId: any; }) => sc.classId);
      } else if (userRoles.includes('teacher')) {
        const teacherClasses = await prisma.class.findMany({
          where: { lessons: { some: { teacherId: userId } } },
          select: { id: true },
        });
        userClassIds = teacherClasses.map((c: { id: any; }) => c.id);
      } else if (userRoles.includes('parent')) {
        const parentClasses = await prisma.studentClass.findMany({
          where: { student: { parentId: userId } },
          select: { classId: true },
          distinct: ['classId'],
        });
        userClassIds = parentClasses.map((sc: { classId: any; }) => sc.classId);
      }
    }

    // --- Fetch all relevant events ---
    const eventsFromDb = await prisma.event.findMany({
      where: {
        ...(userRoles.includes('admin') ? {} : {
          OR: [
            { classId: null }, // Global events
            { classId: { in: userClassIds } }, // Class-specific events
          ],
        }),
      },
      include: {
        class: { // Include class to get the name for the location/classroom
          select: { name: true }
        }
      }
    });

    // --- Format the data for the BigCalendar component ---
    const formattedEvents = eventsFromDb.map((event: { title: any; startTime: any; endTime: any; description: any; id: any; }) => ({
      title: event.title,
      start: event.startTime,
      end: event.endTime,
      description: event.description,
      classroom: (event as any).class?.name, // Use class name as the location
      eventId: event.id,
      type: 'event', // Mark this as an 'event' type
    }));

    return NextResponse.json(formattedEvents);

  } catch (error: any) {
    console.error('Error fetching calendar events:', error.message);
    return NextResponse.json({ error: 'Failed to fetch calendar events' }, { status: 500 });
  }
}