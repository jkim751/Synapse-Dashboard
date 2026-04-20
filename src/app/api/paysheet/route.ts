import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  const { sessionClaims } = await auth();
  const role = (sessionClaims?.metadata as { role?: string })?.role;

  if (role !== "admin" && role !== "director" && role !== "teacher-admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const subjects = await prisma.subject.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      subjectRate: { select: { hourlyRate: true } },
    },
  });

  return NextResponse.json(subjects);
}

export async function PUT(req: NextRequest) {
  const { sessionClaims } = await auth();
  const role = (sessionClaims?.metadata as { role?: string })?.role;

  if (role !== "admin" && role !== "director" && role !== "teacher-admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { subjectId, hourlyRate } = await req.json();

  if (typeof subjectId !== "number" || typeof hourlyRate !== "number" || hourlyRate < 0) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const rate = await prisma.subjectRate.upsert({
    where: { subjectId },
    update: { hourlyRate },
    create: { subjectId, hourlyRate },
  });

  return NextResponse.json(rate);
}
