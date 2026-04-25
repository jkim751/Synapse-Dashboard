import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSenderName } from "@/lib/chatUtils";

export async function POST(req: NextRequest) {
  const { userId, sessionClaims } = await auth();
  const role = (sessionClaims?.metadata as { role?: string })?.role;
  if (!userId || role === "admin" || role === "director") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { targetUserId, targetRole, targetName } = await req.json();
  if (!targetUserId || !targetRole || !targetName) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  // Verify shared class
  if (role === "student" && (targetRole === "teacher" || targetRole === "teacher-admin")) {
    const enrolled = await prisma.studentClass.findMany({
      where: { studentId: userId },
      select: { classId: true },
    });
    const classIds = enrolled.map((sc: { classId: number }) => sc.classId);
    const [l, r] = await Promise.all([
      prisma.lesson.findFirst({ where: { classId: { in: classIds }, teacherId: targetUserId } }),
      prisma.recurringLesson.findFirst({ where: { classId: { in: classIds }, teacherId: targetUserId } }),
    ]);
    if (!l && !r) {
      return NextResponse.json({ error: "No shared class with this teacher" }, { status: 403 });
    }
  } else if ((role === "teacher" || role === "teacher-admin") && targetRole === "student") {
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
    const sc = await prisma.studentClass.findFirst({
      where: { studentId: targetUserId, classId: { in: classIds } },
    });
    if (!sc) {
      return NextResponse.json({ error: "Student is not in your class" }, { status: 403 });
    }
  }

  // Check for existing direct thread between these two users
  const candidates = await prisma.chatThread.findMany({
    where: {
      type: "DIRECT",
      AND: [
        { participants: { some: { userId } } },
        { participants: { some: { userId: targetUserId } } },
      ],
    },
    include: { participants: true },
  });
  const existing = candidates.find((t: { participants: unknown[] }) => t.participants.length === 2);
  if (existing) return NextResponse.json(existing);

  const currentUserName = await getSenderName(userId, role!);

  const thread = await prisma.chatThread.create({
    data: {
      type: "DIRECT",
      createdBy: userId,
      participants: {
        create: [
          { userId, role: role!, name: currentUserName },
          { userId: targetUserId, role: targetRole, name: targetName },
        ],
      },
    },
    include: { participants: true },
  });

  return NextResponse.json(thread, { status: 201 });
}
