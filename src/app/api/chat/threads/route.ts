import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

const threadInclude = {
  class: { select: { name: true } },
  messages: {
    orderBy: { createdAt: "desc" as const },
    take: 1,
    select: { id: true, senderId: true, senderName: true, content: true, createdAt: true },
  },
  participants: { select: { userId: true, role: true, name: true } },
};

function formatThread(thread: any, userId: string, readRecord: any) {
  const lastMsg = thread.messages[0] ?? null;
  const hasUnread =
    lastMsg !== null &&
    lastMsg.senderId !== userId &&
    (!readRecord || new Date(lastMsg.createdAt) > new Date(readRecord.lastReadAt));

  const name =
    thread.type === "CLASS"
      ? thread.class?.name || thread.name || "Group Chat"
      : thread.participants.find((p: any) => p.userId !== userId)?.name || "Direct Message";

  return {
    id: thread.id,
    type: thread.type,
    name,
    classId: thread.classId ?? null,
    lastMessage: lastMsg
      ? { content: lastMsg.content, senderName: lastMsg.senderName, createdAt: lastMsg.createdAt }
      : null,
    lastReadAt: readRecord?.lastReadAt ?? null,
    hasUnread,
  };
}

export async function GET() {
  const { userId, sessionClaims } = await auth();
  const role = (sessionClaims?.metadata as { role?: string })?.role;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const readsWhere = { reads: { where: { userId } } };

  if (role === "admin" || role === "director") {
    const threads = await prisma.chatThread.findMany({
      include: { ...threadInclude, reads: { where: { userId } } },
      orderBy: { updatedAt: "desc" },
    });
    return NextResponse.json(
      threads.map((t: any) => formatThread(t, userId, t.reads[0] ?? null))
    );
  }

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

    const [classThreads, directThreads] = await Promise.all([
      prisma.chatThread.findMany({
        where: { type: "CLASS", classId: { in: classIds } },
        include: { ...threadInclude, reads: { where: { userId } } },
      }),
      prisma.chatThread.findMany({
        where: { type: "DIRECT", participants: { some: { userId } } },
        include: { ...threadInclude, reads: { where: { userId } } },
      }),
    ]);

    const all = [...classThreads, ...directThreads].sort(
      (a, b) =>
        new Date(b.messages[0]?.createdAt ?? b.updatedAt).getTime() -
        new Date(a.messages[0]?.createdAt ?? a.updatedAt).getTime()
    );
    return NextResponse.json(all.map((t: any) => formatThread(t, userId, t.reads[0] ?? null)));
  }

  if (role === "student") {
    const enrolled = await prisma.studentClass.findMany({
      where: { studentId: userId },
      select: { classId: true },
    });
    const classIds = enrolled.map((sc: { classId: number }) => sc.classId);

    const [classThreads, directThreads] = await Promise.all([
      prisma.chatThread.findMany({
        where: { type: "CLASS", classId: { in: classIds } },
        include: { ...threadInclude, reads: { where: { userId } } },
      }),
      prisma.chatThread.findMany({
        where: { type: "DIRECT", participants: { some: { userId } } },
        include: { ...threadInclude, reads: { where: { userId } } },
      }),
    ]);

    const all = [...classThreads, ...directThreads].sort(
      (a, b) =>
        new Date(b.messages[0]?.createdAt ?? b.updatedAt).getTime() -
        new Date(a.messages[0]?.createdAt ?? a.updatedAt).getTime()
    );
    return NextResponse.json(all.map((t: any) => formatThread(t, userId, t.reads[0] ?? null)));
  }

  return NextResponse.json([]);
}

export async function POST(req: NextRequest) {
  const { userId, sessionClaims } = await auth();
  const role = (sessionClaims?.metadata as { role?: string })?.role;
  if (!userId || (role !== "teacher" && role !== "teacher-admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { classId } = await req.json();
  if (!classId) return NextResponse.json({ error: "classId required" }, { status: 400 });

  const lesson = await prisma.lesson.findFirst({ where: { classId, teacherId: userId } });
  const rLesson = lesson
    ? null
    : await prisma.recurringLesson.findFirst({ where: { classId, teacherId: userId } });
  if (!lesson && !rLesson) {
    return NextResponse.json({ error: "You do not teach this class" }, { status: 403 });
  }

  const existing = await prisma.chatThread.findFirst({ where: { type: "CLASS", classId } });
  if (existing) return NextResponse.json(existing);

  const cls = await prisma.class.findUnique({ where: { id: classId }, select: { name: true } });
  const thread = await prisma.chatThread.create({
    data: { type: "CLASS", classId, name: cls?.name, createdBy: userId },
  });

  return NextResponse.json(thread, { status: 201 });
}
