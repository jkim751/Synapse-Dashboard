import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  const { userId, sessionClaims } = await auth();
  const role = (sessionClaims?.metadata as { role?: string })?.role;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (role === "teacher" || role === "teacher-admin") {
    const [lessons, rLessons] = await Promise.all([
      prisma.lesson.findMany({ where: { teacherId: userId }, select: { classId: true } }),
      prisma.recurringLesson.findMany({ where: { teacherId: userId }, select: { classId: true } }),
    ]);
    const classIds = [
      ...new Set([
        ...lessons.map((l: { classId: number | null }) => l.classId).filter(Boolean),
        ...rLessons.map((l: { classId: number }) => l.classId),
      ] as number[]),
    ];

    const classes = await prisma.class.findMany({
      where: { id: { in: classIds } },
      select: {
        id: true,
        name: true,
        students: {
          where: { student: { status: { not: "DISENROLLED" } } },
          select: { student: { select: { id: true, name: true, surname: true } } },
        },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ classes });
  }

  if (role === "student") {
    const enrolled = await prisma.studentClass.findMany({
      where: { studentId: userId },
      select: { classId: true },
    });
    const classIds = enrolled.map((sc: { classId: number }) => sc.classId);

    const [lessons2, rLessons2] = await Promise.all([
      prisma.lesson.findMany({
        where: { classId: { in: classIds }, teacherId: { not: null } },
        select: { teacherId: true },
        distinct: ["teacherId"],
      }),
      prisma.recurringLesson.findMany({
        where: { classId: { in: classIds } },
        select: { teacherId: true },
        distinct: ["teacherId"],
      }),
    ]);

    const teacherIds = [
      ...new Set([
        ...lessons2.map((l: { teacherId: string | null }) => l.teacherId).filter(Boolean),
        ...rLessons2.map((l: { teacherId: string }) => l.teacherId),
      ] as string[]),
    ];

    const teachers = await prisma.teacher.findMany({
      where: { id: { in: teacherIds } },
      select: { id: true, name: true, surname: true },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ teachers: teachers.map((t: { id: string; name: string; surname: string }) => ({ ...t, role: "teacher" })) });
  }

  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
