import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const { userId, sessionClaims } = await auth();
  const role = (sessionClaims?.metadata as { role?: string })?.role;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    let assignments;

    switch (role) {
      case "admin":
        assignments = await prisma.assignment.findMany({
          include: {
            lesson: {
              include: {
                subject: true,
                class: true,
                teacher: true,
              },
            },
            recurringLesson: {
              include: {
                subject: true,
                class: true,
                teacher: true,
              },
            },
          },
        });
        break;
      case "teacher":
        assignments = await prisma.assignment.findMany({
          where: {
            OR: [
              { lesson: { teacherId: userId } },
              { recurringLesson: { teacherId: userId } },
            ],
          },
          include: {
            lesson: {
              include: {
                subject: true,
                class: true,
                teacher: true,
              },
            },
            recurringLesson: {
              include: {
                subject: true,
                class: true,
                teacher: true,
              },
            },
          },
        });
        break;
      default:
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json(assignments);
  } catch (error) {
    console.error("Error fetching assignments:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
