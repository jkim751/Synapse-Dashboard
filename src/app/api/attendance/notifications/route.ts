import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';

// --- GET Handler: Fetches all notifications for the logged-in user ---
export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const notifications = await prisma.notification.findMany({
      where: { recipientId: userId },
      orderBy: { createdAt: 'desc' },
      take: 20, // Limit to a reasonable number
    });

    return NextResponse.json(notifications);
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 });
  }
}

// --- PATCH Handler: Marks a single notification as read ---
export async function PATCH(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { notificationId } = await request.json();
    if (!notificationId) {
      return NextResponse.json({ error: 'Notification ID is required' }, { status: 400 });
    }

    await prisma.notification.updateMany({
      where: {
        id: notificationId,
        recipientId: userId, // Ensure user can only mark their own notifications
      },
      data: { isRead: true },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error marking notification as read:", error);
    return NextResponse.json({ error: 'Failed to mark as read' }, { status: 500 });
  }
}


// --- DELETE Handler: Deletes or marks all notifications as read for a user ---
export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Read the 'mode' from the URL's query parameters
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get('mode'); // will be 'delete' or 'read'

    if (mode === 'read') {
      // --- Mark all as read ---
      await prisma.notification.updateMany({
        where: {
          recipientId: userId,
          isRead: false, // Only update unread ones for efficiency
        },
        data: { isRead: true },
      });
      console.log(`Marked all notifications as read for user: ${userId}`);
    } else {
      // --- Default to deleting all ---
      try {
        await prisma.notification.deleteMany({
          where: { recipientId: userId }, // Crucial: Only delete for the current user
        });
        console.log(`Deleted all notifications for user: ${userId}`);
      } catch (deleteError) {
        console.warn("Delete failed, falling back to mark as read:", deleteError);
        // Fallback: mark all as read instead of deleting
        await prisma.notification.updateMany({
          where: {
            recipientId: userId,
          },
          data: { isRead: true },
        });
        console.log(`Marked all notifications as read for user: ${userId} (fallback)`);
      }
    }

    // A successful DELETE should return a 204 No Content status
    return new NextResponse(null, { status: 204 });

  } catch (error) {
    console.error("Error clearing notifications:", error);
    return NextResponse.json({ error: 'Failed to clear notifications' }, { status: 500 });
  }
}

// --- POST Handler: Creates new notifications ---
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { title, message, type, lessonId, recipientIds } = body;

    if (!title || !message) {
      return NextResponse.json({ error: 'Title and message are required' }, { status: 400 });
    }

    let finalRecipients: string[] = [];

    // Case 1: A specific lesson is targeted (e.g., student notifying they will be late from the calendar).
    // Prioritize the teacher of that lesson.
    if (lessonId) {
      const lesson = await prisma.lesson.findUnique({
        where: { id: lessonId },
        include: { teacher: true },
      });
      if (lesson?.teacher?.id) {
        finalRecipients.push(lesson.teacher.id);
        console.log(`Notification for lesson ${lessonId} will be sent to teacher ${lesson.teacher.id}`);
      }
    }

    // Check if sender is a student and get their name
    const student = await prisma.student.findUnique({
      where: { id: userId },
      include: {
        classes: {
          include: {
            class: {
              include: {
                supervisor: true,
                lessons: { include: { teacher: true } },
              },
            },
          },
        },
      },
    });

    // Case 2: No specific lesson, but sender is a student (general inquiry),
    // or if the lesson had no teacher, find all of the student's teachers as a fallback.
    if (finalRecipients.length === 0 && student) {
      console.log("Sender is a student, finding all associated teachers as recipients.");
      const teacherIds = new Set<string>();
      student.classes.forEach((studentClass: { class: { supervisor: { id: string; }; lessons: any[]; }; }) => {
        if (studentClass.class.supervisor?.id) {
          teacherIds.add(studentClass.class.supervisor.id);
        }
        studentClass.class.lessons.forEach((lesson: { teacher: { id: string; }; }) => {
          if (lesson.teacher?.id) {
            teacherIds.add(lesson.teacher.id);
          }
        });
      });
      finalRecipients.push(...Array.from(teacherIds));
    }
    
    // Case 3: Explicit recipients were provided in the original call.
    if (recipientIds && recipientIds.length > 0) {
        finalRecipients.push(...recipientIds);
    }

    // Case 4: Fallback - if no recipients found by any other means, notify the sender.
    if (finalRecipients.length === 0) {
        console.log("No specific recipients found, defaulting to sender.");
        finalRecipients.push(userId);
    }

    const uniqueRecipients = [...new Set(finalRecipients)];
    console.log("Final unique recipients for notification:", uniqueRecipients);

    if (uniqueRecipients.length === 0) {
        return NextResponse.json({ message: "No recipients found for notification." });
    }

    // Create notification title with student name if sender is a student
    let notificationTitle = title;
    if (student) {
      const studentName = `${student.name} ${student.surname}`;
      notificationTitle = `[${studentName}] ${title}`;
    }

    const notifications = await Promise.all(
      uniqueRecipients.map((recipientId: string) =>
        prisma.notification.create({
          data: {
            title: notificationTitle,
            message,
            recipientId,
            type,
            lessonId,
          },
        })
      )
    );

    console.log(`Created ${notifications.length} notifications.`);
    return NextResponse.json(notifications[0] || { message: "Notification processed." });

  } catch (error) {
    console.error("POST - Error creating notification:", error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: 'Failed to create notification', details: errorMessage }, { status: 500 });
  }
}