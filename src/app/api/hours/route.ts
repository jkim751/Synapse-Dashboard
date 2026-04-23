import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

const allowed = (role: string | undefined) =>
  role === "director" || role === "teacher-admin" || role === "teacher";

export async function GET(req: NextRequest) {
  const { userId, sessionClaims } = await auth();
  const role = (sessionClaims?.metadata as { role?: string })?.role;
  if (!userId || !allowed(role)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const targetTeacherId = searchParams.get("teacherId");

  const isAdmin = role === "director" || role === "teacher-admin";
  const teacherId = isAdmin && targetTeacherId ? targetTeacherId : userId;

  const entries = await prisma.workedHours.findMany({
    where: isAdmin && !targetTeacherId ? {} : { teacherId },
    orderBy: { date: "desc" },
  });

  return NextResponse.json(entries);
}

export async function POST(req: NextRequest) {
  const { userId, sessionClaims } = await auth();
  const role = (sessionClaims?.metadata as { role?: string })?.role;
  if (!userId || !allowed(role)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { className, date, hoursWorked, attendees, notes, teacherId } = await req.json();
  if (!className?.trim() || !hoursWorked || isNaN(Number(hoursWorked))) {
    return NextResponse.json({ error: "Class name and hours are required" }, { status: 400 });
  }

  const isAdmin = role === "director" || role === "teacher-admin";
  const resolvedTeacherId = isAdmin && teacherId ? teacherId : userId;

  const entry = await prisma.workedHours.create({
    data: {
      teacherId: resolvedTeacherId,
      className: className.trim(),
      date: date ? new Date(date) : new Date(),
      hoursWorked: Number(hoursWorked),
      attendees: attendees?.trim() || null,
      notes: notes?.trim() || null,
    },
  });

  return NextResponse.json(entry, { status: 201 });
}
