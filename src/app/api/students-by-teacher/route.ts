import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const { userId } = await auth();
  
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get all students from classes where the teacher teaches
    const students = await prisma.student.findMany({
      where: {
        classes: {
          some: {
            class: {
              RecurringLesson: {
                some: {
                  teacherId: userId,
                },
              },
            },
          },
        },
      },
      select: {
        id: true,
        name: true,
        surname: true,
        classes: {
          select: {
            class: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: [
        { surname: 'asc' },
        { name: 'asc' }
      ]
    });

    return NextResponse.json(students);
  } catch (error) {
    console.error("Error fetching students by teacher:", error);
    return NextResponse.json({ error: "Failed to fetch students" }, { status: 500 });
  }
}
