import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { canAccessThread } from "@/lib/chatUtils";

export async function PATCH(
  _req: NextRequest,
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

  const now = new Date();
  await Promise.all([
    prisma.chatThreadRead.upsert({
      where: { threadId_userId: { threadId, userId } },
      create: { threadId, userId, lastReadAt: now },
      update: { lastReadAt: now },
    }),
    prisma.notification.updateMany({
      where: { recipientId: userId, type: `CHAT_${threadId}`, isRead: false },
      data: { isRead: true },
    }),
  ]);

  return NextResponse.json({ success: true });
}
