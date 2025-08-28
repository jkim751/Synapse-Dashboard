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

    const { studentId, lessonId, present, date } = await request.json();

    // Validate required fields
    if (!studentId || !lessonId || typeof present !== "boolean" || !date) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const attendanceDate = new Date(date);
    const startOfDay = new Date(attendanceDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(attendanceDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Check if attendance record already exists for this student, lesson, and date
    const existingAttendance = await prisma.attendance.findFirst({
      where: {
        studentId,
        lessonId,
        date: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    });

    let attendanceResult;

    if (existingAttendance) {
      // Update existing attendance record
      attendanceResult = await prisma.attendance.update({
        where: {
          id: existingAttendance.id,
        },
        data: {
          present,
        },
      });
    } else {
      // Create new attendance record
      attendanceResult = await prisma.attendance.create({
        data: {
          studentId,
          lessonId,
          present,
          date: attendanceDate,
        },
      });
    }

    // If student is marked as absent, send notification to teacher
    if (!present) {
      try {
        // Get lesson details with teacher and student info
        const lessonDetails = await prisma.lesson.findUnique({
          where: { id: lessonId },
          include: {
            teacher: true,
            subject: true,
            class: true,
          },
        });

        // Get student details
        const studentDetails = await prisma.student.findUnique({
          where: { id: studentId },
        });

        if (lessonDetails?.teacher && studentDetails) {
          // Create notification for the teacher
          await prisma.notification.create({
            data: {
              title: "Student Absence Alert",
              message: `${studentDetails.name} ${studentDetails.surname} is absent from ${lessonDetails.subject?.name || 'the lesson'} in ${lessonDetails.class?.name || 'class'}`,
              recipientId: lessonDetails.teacher.id,
              type: "student_absence",
              lessonId: lessonId,
            },
          });

          console.log(`Created absence notification for teacher ${lessonDetails.teacher.id} about student ${studentId}`);
        }
      } catch (notificationError) {
        console.error("Error creating absence notification:", notificationError);
        // Don't fail the attendance update if notification fails
      }
    }
    
    return NextResponse.json(attendanceResult);
  } catch (error) {
    console.error("Error marking attendance:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Handle other HTTP methods with proper error response
export async function GET() {
    return NextResponse.json(
      { error: "Method not allowed" },
      { status: 405 }
    );
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