import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  const { sessionClaims } = await auth();
  const role = (sessionClaims?.metadata as { role?: string })?.role;

  if (role !== "admin" && role !== "director" && role !== "teacher-admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const schedules = await prisma.schedule.findMany({
    orderBy: { startTime: "asc" },
  });

  return NextResponse.json(schedules);
}

export async function POST(req: NextRequest) {
  const { userId, sessionClaims } = await auth();
  const role = (sessionClaims?.metadata as { role?: string })?.role;

  if (role !== "admin" && role !== "director" && role !== "teacher-admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { title, description, startTime, endTime, type, rrule } = body;

  if (!title || !description || !startTime || !endTime) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const start = new Date(startTime);
  const end = new Date(endTime);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return NextResponse.json({ error: "Invalid date format" }, { status: 400 });
  }

  if (end <= start) {
    return NextResponse.json({ error: "End time must be after start time" }, { status: 400 });
  }

  const schedule = await prisma.schedule.create({
    data: {
      title,
      description,
      startTime: start,
      endTime: end,
      type: type === "shift" ? "shift" : "event",
      rrule: typeof rrule === "string" && rrule.trim() ? rrule.trim() : null,
      createdBy: userId!,
    },
  });

  return NextResponse.json(schedule, { status: 201 });
}
