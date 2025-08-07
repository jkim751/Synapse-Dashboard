
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

    if (existingAttendance) {
      // Update existing attendance record
      const updatedAttendance = await prisma.attendance.update({
        where: {
          id: existingAttendance.id,
        },
        data: {
          present,
        },
      });
      
      return NextResponse.json(updatedAttendance);
    } else {
      // Create new attendance record
      const newAttendance = await prisma.attendance.create({
        data: {
          studentId,
          lessonId,
          present,
          date: attendanceDate,
        },
      });
      
      return NextResponse.json(newAttendance);
    }
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