
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { ITEM_PER_PAGE } from "@/lib/settings";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
    const resolvedParams = await params;
    const classId = parseInt(resolvedParams.id);
    
    if (isNaN(classId)) {
      return NextResponse.json(
        { error: "Invalid class ID" },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const search = searchParams.get('search') || '';

    // Get class information
    const classInfo = await prisma.class.findUnique({
      where: { id: classId },
      include: {
        supervisor: true,
        grade: true,
      },
    });

    if (!classInfo) {
      return NextResponse.json(
        { error: "Class not found" },
        { status: 404 }
      );
    }

    // Get current date for attendance marking
    const today = new Date();
    const startOfDay = new Date(today);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);

    // Build query for students
    const query: any = {
      classId: classId,
    };

    if (search) {
      query.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { surname: { contains: search, mode: "insensitive" } },
      ];
    }

    // Get students with their attendance records
    const [students, count] = await prisma.$transaction([
      prisma.student.findMany({
        where: query,
        include: {
          attendances: {
            where: {
              date: {
                gte: startOfDay,
                lte: endOfDay,
              },
            },
            include: {
              lesson: true,
            },
          },
        },
        take: ITEM_PER_PAGE,
        skip: ITEM_PER_PAGE * (page - 1),
        orderBy: { name: "asc" },
      }),
      prisma.student.count({ where: query }),
    ]);

    // Get today's lessons for this class
    const todayLessons = await prisma.lesson.findMany({
      where: {
        classId: classId,
        day: getDayOfWeek(today),
      },
      include: {
        subject: true,
        teacher: true,
      },
      orderBy: { startTime: "asc" },
    });

    return NextResponse.json({
      students,
      classInfo,
      todayLessons,
      count,
    });
  } catch (error) {
    console.error("Error fetching class attendance data:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}



// Helper function to get day of week for Prisma enum
function getDayOfWeek(date: Date): "MONDAY" | "TUESDAY" | "WEDNESDAY" | "THURSDAY" | "FRIDAY" {
  const days = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];
  const dayName = days[date.getDay()];
  
  // Only return weekdays, default to MONDAY for weekends
  if (["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"].includes(dayName)) {
    return dayName as "MONDAY" | "TUESDAY" | "WEDNESDAY" | "THURSDAY" | "FRIDAY";
  }
  return "MONDAY";
}
