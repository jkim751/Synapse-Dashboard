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

export async function GET() {
  const { userId, sessionClaims } = await auth();
  const role = (sessionClaims?.metadata as { role?: string })?.role;
  if (!userId || (role !== "admin" && role !== "director" && role !== "teacher-admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const items = await prisma.checklistItem.findMany({
    where: { userId: "shared" },
    orderBy: [{ type: "asc" }, { createdAt: "asc" }],
  });

  return NextResponse.json(
    items.map((item: { completedAt: Date | null; type: string; }) => ({
      ...item,
      isCompleted: isCompletedForType(item.completedAt, item.type),
    }))
  );
}

export async function POST(req: NextRequest) {
  const { userId, sessionClaims } = await auth();
  const role = (sessionClaims?.metadata as { role?: string })?.role;
  if (!userId || (role !== "admin" && role !== "director" && role !== "teacher-admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { text, type } = await req.json();
  if (!text?.trim() || !["DAILY", "MONTHLY"].includes(type)) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const item = await prisma.checklistItem.create({
    data: { text: text.trim(), type, userId: "shared" },
  });

  return NextResponse.json({ ...item, isCompleted: false }, { status: 201 });
}
