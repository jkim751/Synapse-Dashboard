import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId, sessionClaims } = await auth();
  const role = (sessionClaims?.metadata as { role?: string })?.role;

  if (!userId || (role !== "admin" && role !== "director")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const lessonId = parseInt(id);

  if (isNaN(lessonId)) {
    return NextResponse.json({ error: "Invalid lesson ID" }, { status: 400 });
  }

  // Verify it's actually a makeup lesson before deleting
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    select: { isMakeup: true },
  });

  if (!lesson) {
    return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
  }

  if (!lesson.isMakeup) {
    return NextResponse.json({ error: "Only makeup lessons can be deleted this way" }, { status: 403 });
  }

  // Delete makeup student records first (FK), then the lesson
  await prisma.makeupStudent.deleteMany({ where: { lessonId } });
  await prisma.notification.deleteMany({ where: { lessonId } });
  await prisma.lesson.delete({ where: { id: lessonId } });

  return NextResponse.json({ success: true });
}
