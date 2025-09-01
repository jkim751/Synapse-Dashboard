import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";

export async function POST(request: NextRequest) {
  try {
    const { userId, sessionClaims } = await auth();
    const role = (sessionClaims?.metadata as { role?: string })?.role;

    if (!userId || !["admin", "teacher"].includes(role || "")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { studentId, lessonId, recurringLessonId, status, date, clear } = body;

    if (!studentId || (!lessonId && !recurringLessonId) || !date) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const attendanceDate = new Date(date);
    attendanceDate.setHours(0, 0, 0, 0);

    // If clear flag is set, delete the attendance record
    if (clear) {
      const whereClause: any = {
        studentId,
        date: attendanceDate,
      };

      if (lessonId) {
        whereClause.lessonId = lessonId;
      } else if (recurringLessonId) {
        whereClause.recurringLessonId = recurringLessonId;
      }

      await prisma.attendance.deleteMany({
        where: whereClause,
      });

      return NextResponse.json({ message: "Attendance cleared successfully" });
    }

    // Validate status
    const validStatuses = ["present", "absent", "trial", "makeup", "cancelled"];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    // Create or update attendance record
    const attendanceData: any = {
      studentId,
      date: attendanceDate,
      present: status === "present",
      status,
    };

    if (lessonId) {
      attendanceData.lessonId = lessonId;
    } else if (recurringLessonId) {
      attendanceData.recurringLessonId = recurringLessonId;
    }

    // Check if attendance record already exists
    const existingAttendance = await prisma.attendance.findFirst({
      where: {
        studentId,
        date: attendanceDate,
        lessonId: lessonId ?? null,
        recurringLessonId: recurringLessonId ?? null,
      },
    });

    let attendance;
    if (existingAttendance) {
      // Update existing record
      attendance = await prisma.attendance.update({
        where: { id: existingAttendance.id },
        data: {
          present: status === "present",
          status,
        },
      });
    } else {
      // Create new record
      attendance = await prisma.attendance.create({
        data: attendanceData,
      });
    }

    return NextResponse.json(attendance);
  } catch (error) {
    console.error("Error handling attendance:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  const { userId } = await auth();

  if (!userId) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
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

export async function DELETE(request: NextRequest) {
  try {
    const { userId, sessionClaims } = await auth();
    const role = (sessionClaims?.metadata as { role?: string })?.role;

    if (!userId || !["admin", "teacher"].includes(role || "")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { studentId, lessonId, recurringLessonId, date } = body;

    if (!studentId || (!lessonId && !recurringLessonId) || !date) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const attendanceDate = new Date(date);
    attendanceDate.setHours(0, 0, 0, 0);

    const whereClause: any = {
      studentId,
      date: attendanceDate,
    };

    if (lessonId) {
      whereClause.lessonId = lessonId;
    } else if (recurringLessonId) {
      whereClause.recurringLessonId = recurringLessonId;
    }

    await prisma.attendance.deleteMany({
      where: whereClause,
    });

    return NextResponse.json({ message: "Attendance cleared successfully" });
  } catch (error) {
    console.error("Error clearing attendance:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}