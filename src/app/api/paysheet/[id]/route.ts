import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { sessionClaims } = await auth();
  const role = (sessionClaims?.metadata as { role?: string })?.role;

  if (role !== "admin" && role !== "director" && role !== "teacher-admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const subjectId = parseInt(id, 10);
  if (isNaN(subjectId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  // Check if subject is used in any lessons before deleting
  const [lessonCount, recurringCount] = await Promise.all([
    prisma.lesson.count({ where: { subjectId } }),
    prisma.recurringLesson.count({ where: { subjectId } }),
  ]);

  if (lessonCount > 0 || recurringCount > 0) {
    // Subject is in use — just clear the rates, keep the subject
    await prisma.subjectRate.deleteMany({ where: { subjectId } });
    return NextResponse.json({ deleted: "rates-only" });
  }

  // Delete subjectRate first, then subject (no DB cascade configured)
  await prisma.subjectRate.deleteMany({ where: { subjectId } });
  await prisma.subject.delete({ where: { id: subjectId } });
  return NextResponse.json({ deleted: "subject" });
}
