import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

function isCompletedForType(completedAt: Date | null, type: string): boolean {
  if (!completedAt) return false;
  const now = new Date();
  if (type === "DAILY") {
    return completedAt.toDateString() === now.toDateString();
  }
  return (
    completedAt.getMonth() === now.getMonth() &&
    completedAt.getFullYear() === now.getFullYear()
  );
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId, sessionClaims } = await auth();
  const role = (sessionClaims?.metadata as { role?: string })?.role;
  if (!userId || (role !== "admin" && role !== "director" && role !== "teacher-admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { text } = await req.json();
  if (!text?.trim()) {
    return NextResponse.json({ error: "Text is required" }, { status: 400 });
  }

  const item = await prisma.checklistItem.findUnique({ where: { id } });
  if (!item) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const updated = await prisma.checklistItem.update({
    where: { id },
    data: { text: text.trim() },
  });

  return NextResponse.json({
    ...updated,
    isCompleted: isCompletedForType(updated.completedAt, updated.type),
  });
}

export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId, sessionClaims } = await auth();
  const role = (sessionClaims?.metadata as { role?: string })?.role;
  if (!userId || (role !== "admin" && role !== "director" && role !== "teacher-admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const item = await prisma.checklistItem.findUnique({ where: { id } });
  if (!item) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const currentlyCompleted = isCompletedForType(item.completedAt, item.type);
  const updated = await prisma.checklistItem.update({
    where: { id },
    data: { completedAt: currentlyCompleted ? null : new Date() },
  });

  return NextResponse.json({ ...updated, isCompleted: !currentlyCompleted });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId, sessionClaims } = await auth();
  const role = (sessionClaims?.metadata as { role?: string })?.role;
  if (!userId || (role !== "admin" && role !== "director" && role !== "teacher-admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const item = await prisma.checklistItem.findUnique({ where: { id } });
  if (!item) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.checklistItem.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
