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
    let assessments;
    const include = {
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
    };

    switch (role) {
      case "admin":
      case "director":
      case "teacher-admin":
        assessments = await prisma.assessment.findMany({ include });
        break;
      case "teacher":
        assessments = await prisma.assessment.findMany({
          where: {
            OR: [
              { lesson: { teacherId: userId } },
              { recurringLesson: { teacherId: userId } },
            ],
          },
          include,
        });
        break;
      default:
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json(assessments);
  } catch (error) {
    console.error("Error fetching assessments:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
