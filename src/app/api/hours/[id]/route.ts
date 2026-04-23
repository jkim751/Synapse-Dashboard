import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

const allowed = (role: string | undefined) =>
  role === "director" || role === "teacher-admin" || role === "teacher";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId, sessionClaims } = await auth();
  const role = (sessionClaims?.metadata as { role?: string })?.role;
  if (!userId || !allowed(role)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const entry = await prisma.workedHours.findUnique({ where: { id } });
  if (!entry) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isAdmin = role === "director" || role === "teacher-admin";
  if (!isAdmin && entry.teacherId !== userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const data: Record<string, any> = {};
  if (body.className !== undefined) data.className = body.className.trim();
  if (body.date !== undefined) data.date = new Date(body.date);
  if (body.hoursWorked !== undefined) data.hoursWorked = Number(body.hoursWorked);
  if (body.attendees !== undefined) data.attendees = body.attendees?.trim() || null;
  if (body.notes !== undefined) data.notes = body.notes?.trim() || null;

  const updated = await prisma.workedHours.update({ where: { id }, data });
  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId, sessionClaims } = await auth();
  const role = (sessionClaims?.metadata as { role?: string })?.role;
  if (!userId || !allowed(role)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const entry = await prisma.workedHours.findUnique({ where: { id } });
  if (!entry) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isAdmin = role === "director" || role === "teacher-admin";
  if (!isAdmin && entry.teacherId !== userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  await prisma.workedHours.delete({ where: { id } });
  return NextResponse.json({ deleted: true });
}
