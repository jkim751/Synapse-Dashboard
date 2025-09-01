import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";

export async function POST(request: NextRequest) {
  try {
    const { sessionClaims } = await auth();
    const role = (sessionClaims?.metadata as { role?: string })?.role;

    // Check if user is authorized (admin or teacher)
    if (!role || !["admin", "teacher"].includes(role)) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { studentId, lessonId, recurringLessonId, status, date } = await request.json();

    // Validate required fields - either lessonId or recurringLessonId must be provided
    const validStatuses = ["present", "absent", "trial", "makeup", "cancelled"];
    
    // Additional validation for lesson IDs
    if (lessonId && (typeof lessonId !== 'number' || isNaN(lessonId))) {
      return NextResponse.json(
        { error: "Invalid lessonId: must be a number" },
        { status: 400 }
      );
    }
    
    if (recurringLessonId && (typeof recurringLessonId !== 'number' || isNaN(recurringLessonId))) {
      return NextResponse.json(
        { error: "Invalid recurringLessonId: must be a number" },
        { status: 400 }
      );
    }

    if (!studentId || (!lessonId && !recurringLessonId) || !status || !validStatuses.includes(status) || !date) {
      return NextResponse.json(
        { error: "Missing required fields or invalid status" },
        { status: 400 }
      );
    }

    const attendanceDate = new Date(date);
    const startOfDay = new Date(attendanceDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(attendanceDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Check if attendance record already exists for this student, lesson/recurring lesson, and date
    const whereClause: any = {
      studentId,
      date: {
        gte: startOfDay,
        lte: endOfDay,
      },
    };

    // Only add the field that is provided and valid
    if (lessonId && typeof lessonId === 'number') {
      whereClause.lessonId = lessonId;
      whereClause.recurringLessonId = null; // Ensure we're not matching recurring lessons
    } else if (recurringLessonId && typeof recurringLessonId === 'number') {
      whereClause.recurringLessonId = recurringLessonId;
      whereClause.lessonId = null; // Ensure we're not matching regular lessons
    }

    console.log('Looking for existing attendance with where clause:', whereClause);

    const existingAttendance = await prisma.attendance.findFirst({
      where: whereClause,
    });

    let attendanceResult;

    // Map status to present boolean and add status field
    const present = status === "present";
    const attendanceStatus = status;

    if (existingAttendance) {
      // Update existing attendance record
      const updateData: any = {
        present,
      };
      
      try {
        updateData.status = attendanceStatus;
        attendanceResult = await prisma.attendance.update({
          where: {
            id: existingAttendance.id,
          },
          data: updateData,
        });
      } catch (error) {
        console.log("Status field not available, updating without it:", error);
        attendanceResult = await prisma.attendance.update({
          where: {
            id: existingAttendance.id,
          },
          data: {
            present,
          },
        });
      }
    } else {
      // Create new attendance record
      const createData: any = {
        studentId,
        present,
        date: attendanceDate,
      };

      // Add lesson or recurring lesson ID
      if (lessonId && typeof lessonId === 'number') {
        createData.lessonId = lessonId;
        
        // Try to get recurringLessonId from the lesson
        try {
          const lesson = await prisma.lesson.findUnique({
            where: { id: lessonId },
            select: { recurringLessonId: true },
          });
          
          if (lesson?.recurringLessonId) {
            createData.recurringLessonId = lesson.recurringLessonId;
          }
        } catch (lessonError) {
          console.log("Could not fetch lesson details:", lessonError);
        }
      } else if (recurringLessonId && typeof recurringLessonId === 'number') {
        createData.recurringLessonId = recurringLessonId;
        // For recurring lessons, we don't need a regular lessonId
      }

      console.log('Creating attendance with data:', createData);

      try {
        createData.status = attendanceStatus;
        attendanceResult = await prisma.attendance.create({
          data: createData,
        });
      } catch (error) {
        console.log("Status field not available, creating without it:", error);
        delete createData.status;
        attendanceResult = await prisma.attendance.create({
          data: createData,
        });
      }
    }

    // Only send absence notification for actual absences
    if (status === "absent") {
      try {
        let lessonDetails;
        let studentDetails;

        // Get lesson details based on lesson type
        if (lessonId) {
          lessonDetails = await prisma.lesson.findUnique({
            where: { id: lessonId },
            include: {
              teacher: true,
              subject: true,
              class: true,
            },
          });
        } else if (recurringLessonId) {
          lessonDetails = await prisma.recurringLesson.findUnique({
            where: { id: recurringLessonId },
            include: {
              teacher: true,
              subject: true,
              class: true,
            },
          });
        }

        studentDetails = await prisma.student.findUnique({
          where: { id: studentId },
        });

        if (lessonDetails?.teacher && studentDetails) {
          const notificationData: any = {
            title: "Student Absence Alert",
            message: `${studentDetails.name} ${studentDetails.surname} is absent from ${lessonDetails.subject?.name || 'the lesson'} in ${lessonDetails.class?.name || 'class'}`,
            recipientId: lessonDetails.teacher.id,
            type: "student_absence",
          };

          if (lessonId) {
            notificationData.lessonId = lessonId;
          }
          // Note: Notifications model doesn't have recurringLessonId field
          // You might need to add it to the schema if you want to link notifications to recurring lessons

          await prisma.notification.create({
            data: notificationData,
          });

          console.log(`Created absence notification for teacher ${lessonDetails.teacher.id} about student ${studentId}`);
        }
      } catch (notificationError) {
        console.error("Error creating absence notification:", notificationError);
      }
    }
    
    return NextResponse.json(attendanceResult);
  } catch (error) {
    console.error("Error marking attendance:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

// Handle other HTTP methods with proper error response
export async function GET(request: Request) {
  // --- FIX: Authenticate the user at the beginning of the route ---
  const { userId } = await auth();

  if (!userId) {
    // If there's no user, return the 401 error
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    // ... rest of your logic to fetch notifications for the userId ...
    const notifications = await prisma.notification.findMany({
      where: {
        recipientId: userId,
        isRead: false,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(notifications);
  } catch (error) {
    console.error("Failed to fetch notifications:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

export async function PUT() {
  return NextResponse.json(
    { error: "Method not allowed" },
    { status: 405 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { error: "Method not allowed" },
    { status: 405 }
  );
}