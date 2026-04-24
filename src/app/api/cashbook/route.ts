import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

const PAGE_SIZE = 20;
const ALLOWED = ["admin", "director", "teacher-admin"];

export async function GET(req: NextRequest) {
  const { sessionClaims } = await auth();
  const role = (sessionClaims?.metadata as { role?: string })?.role;
  if (!role || !ALLOWED.includes(role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const page = Math.max(1, parseInt(req.nextUrl.searchParams.get("page") ?? "1"));
  const skip = (page - 1) * PAGE_SIZE;

  const [entries, total] = await Promise.all([
    prisma.cashbookEntry.findMany({
      orderBy: { date: "desc" },
      skip,
      take: PAGE_SIZE,
    }),
    prisma.cashbookEntry.count(),
  ]);

  return NextResponse.json({
    entries,
    total,
    pages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  });
}

export async function POST(req: NextRequest) {
  const { userId, sessionClaims } = await auth();
  const role = (sessionClaims?.metadata as { role?: string })?.role;
  if (!userId || !role || !ALLOWED.includes(role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { name, amount, date } = await req.json();

  if (!name || amount === undefined) {
    return NextResponse.json({ error: "name and amount are required" }, { status: 400 });
  }

  let addedBy: string | undefined;
  if (role === "director") {
    const person = await prisma.director.findUnique({ where: { id: userId }, select: { name: true, surname: true } });
    if (person) addedBy = `${person.name} ${person.surname}`;
  } else {
    const person = await prisma.admin.findUnique({ where: { id: userId }, select: { name: true, surname: true } });
    if (person) addedBy = `${person.name} ${person.surname}`;
  }

  const entry = await prisma.cashbookEntry.create({
    data: {
      name: String(name).trim(),
      amount: parseFloat(amount),
      date: date ? new Date(date) : new Date(),
      ...(addedBy ? { addedBy } : {}),
    },
  });

  return NextResponse.json(entry, { status: 201 });
}
