import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

const allowed = (role: string | undefined) =>
  role === "admin" || role === "director" || role === "teacher-admin";

export async function GET() {
  const { sessionClaims } = await auth();
  const role = (sessionClaims?.metadata as { role?: string })?.role;
  if (!allowed(role)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const subjects = await prisma.subject.findMany({
    where: { subjectRate: { isNot: null } },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      subjectRate: { select: { hourlyRate: true, privateRate: true, groupRate: true } },
    },
  });

  return NextResponse.json(subjects);
}

export async function POST(req: NextRequest) {
  const { sessionClaims } = await auth();
  const role = (sessionClaims?.metadata as { role?: string })?.role;
  if (!allowed(role)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name } = await req.json();
  if (!name || typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const subject = await prisma.subject.create({
    data: {
      name: name.trim(),
      subjectRate: { create: {} },
    },
    select: {
      id: true,
      name: true,
      subjectRate: { select: { hourlyRate: true, privateRate: true, groupRate: true } },
    },
  });

  return NextResponse.json(subject, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const { sessionClaims } = await auth();
  const role = (sessionClaims?.metadata as { role?: string })?.role;
  if (!allowed(role)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { subjectId, hourlyRate, privateRate, groupRate } = await req.json();

  if (typeof subjectId !== "number") {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const data: Record<string, number | null> = {};
  if (hourlyRate !== undefined) data.hourlyRate = hourlyRate;
  if (privateRate !== undefined) data.privateRate = privateRate;
  if (groupRate !== undefined) data.groupRate = groupRate;

  const rate = await prisma.subjectRate.upsert({
    where: { subjectId },
    update: data,
    create: { subjectId, ...data },
  });

  return NextResponse.json(rate);
}
