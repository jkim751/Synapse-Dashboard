import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { canAccessThread, getSenderName } from "@/lib/chatUtils";

const LIMIT = 50;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId, sessionClaims } = await auth();
  const role = (sessionClaims?.metadata as { role?: string })?.role;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const threadId = parseInt(id);

  if (!(await canAccessThread(threadId, userId, role))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const cursor = searchParams.get("cursor");
  const after = searchParams.get("after");

  if (after) {
    const messages = await prisma.chatMessage.findMany({
      where: { threadId, id: { gt: parseInt(after) }, isDeleted: false },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json({ messages, hasMore: false });
  }

  const items = await prisma.chatMessage.findMany({
    where: {
      threadId,
      isDeleted: false,
      ...(cursor ? { id: { lt: parseInt(cursor) } } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: LIMIT + 1,
  });

  const hasMore = items.length > LIMIT;
  const messages = items.slice(0, LIMIT).reverse();

  return NextResponse.json({ messages, hasMore });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId, sessionClaims } = await auth();
  const role = (sessionClaims?.metadata as { role?: string })?.role;
  if (!userId || role === "admin" || role === "director") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const threadId = parseInt(id);

  if (!(await canAccessThread(threadId, userId, role))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { content } = await req.json();
  if (!content?.trim()) return NextResponse.json({ error: "Content required" }, { status: 400 });

  const senderName = await getSenderName(userId, role!);

  const message = await prisma.chatMessage.create({
    data: { threadId, senderId: userId, senderName, content: content.trim() },
  });

  await prisma.chatThread.update({
    where: { id: threadId },
    data: { updatedAt: new Date() },
  });

  // Resolve notification recipients without blocking the response
  sendChatNotifications(threadId, userId, senderName, content.trim()).catch(() => {});

  return NextResponse.json(message, { status: 201 });
}

async function sendChatNotifications(
  threadId: number,
  senderId: string,
  senderName: string,
  content: string
) {
  const thread = await prisma.chatThread.findUnique({
    where: { id: threadId },
    include: {
      class: {
        select: {
          name: true,
          students: { select: { studentId: true }, where: { student: { status: { not: "DISENROLLED" } } } },
        },
      },
      participants: { select: { userId: true } },
    },
  });
  if (!thread) return;

  let recipientIds: string[] = [];
  const threadName = thread.type === "CLASS" ? thread.class?.name ?? "Group Chat" : senderName;

  if (thread.type === "CLASS" && thread.classId) {
    const [lessons, rLessons] = await Promise.all([
      prisma.lesson.findMany({ where: { classId: thread.classId }, select: { teacherId: true }, distinct: ["teacherId"] }),
      prisma.recurringLesson.findMany({ where: { classId: thread.classId }, select: { teacherId: true }, distinct: ["teacherId"] }),
    ]);
    const teacherIds = [
      ...new Set([
        ...lessons.map((l: { teacherId: string | null }) => l.teacherId).filter(Boolean),
        ...rLessons.map((l: { teacherId: string }) => l.teacherId),
      ] as string[]),
    ];
    const studentIds = (thread.class?.students ?? []).map((s: any) => s.studentId);
    recipientIds = [...teacherIds, ...studentIds].filter((id) => id !== senderId);
  } else {
    recipientIds = thread.participants.map((p: any) => p.userId).filter((id: string) => id !== senderId);
  }

  if (recipientIds.length === 0) return;

  const msgPreview = `${senderName}: ${content.slice(0, 80)}`;
  const notifType = `CHAT_${threadId}`;

  const existing = await prisma.notification.findMany({
    where: { recipientId: { in: recipientIds }, type: notifType, isRead: false },
    select: { id: true, recipientId: true },
  });
  const existingMap = new Map(existing.map((n: { id: string; recipientId: string }) => [n.recipientId, n.id]));

  const toUpdate = recipientIds.filter((id) => existingMap.has(id));
  const toCreate = recipientIds.filter((id) => !existingMap.has(id));

  await Promise.all([
    ...toUpdate.map((id) =>
      prisma.notification.update({
        where: { id: existingMap.get(id)! },
        data: { message: msgPreview, updatedAt: new Date() },
      })
    ),
    toCreate.length > 0
      ? prisma.notification.createMany({
          data: toCreate.map((recipientId) => ({
            title: `New message in ${threadName}`,
            message: msgPreview,
            type: notifType,
            recipientId,
          })),
        })
      : Promise.resolve(),
  ]);
}
