import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

const allowed = (role: string | undefined) =>
  role === "admin" || role === "director" || role === "teacher-admin";

export async function GET() {
  const { sessionClaims } = await auth();
  const role = (sessionClaims?.metadata as { role?: string })?.role;
  if (!allowed(role)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const entries = await prisma.paySheetEntry.findMany({
    orderBy: { name: "asc" },
  });

  return NextResponse.json(entries);
}

export async function POST(req: NextRequest) {
  const { sessionClaims } = await auth();
  const role = (sessionClaims?.metadata as { role?: string })?.role;
  if (!allowed(role)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, classType } = await req.json();
  if (!name || typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const existing = await prisma.paySheetEntry.findFirst({
    where: { name: name.trim(), classType: classType ?? null },
  });
  if (existing) {
    return NextResponse.json({ error: "Entry already exists on pay sheet" }, { status: 409 });
  }

  const entry = await prisma.paySheetEntry.create({
    data: { name: name.trim(), classType: classType ?? null },
  });

  return NextResponse.json(entry, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const { sessionClaims } = await auth();
  const role = (sessionClaims?.metadata as { role?: string })?.role;
  if (!allowed(role)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, privateRate, groupRate, hours } = await req.json();
  if (!id || typeof id !== "string") {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const data: Record<string, number | null> = {};
  if (privateRate !== undefined) data.privateRate = privateRate;
  if (groupRate !== undefined) data.groupRate = groupRate;
  if (hours !== undefined) data.hours = hours;

  const entry = await prisma.paySheetEntry.update({ where: { id }, data });
  return NextResponse.json(entry);
}
