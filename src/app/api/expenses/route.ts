import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { sessionClaims } = await auth();
  const role = (sessionClaims?.metadata as { role?: string })?.role;
  if (role !== "admin" && role !== "director" && role !== "teacher-admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const year = parseInt(searchParams.get("year") ?? "");
  const month = parseInt(searchParams.get("month") ?? ""); // 0-indexed

  if (isNaN(year) || isNaN(month)) {
    return NextResponse.json({ error: "year and month are required" }, { status: 400 });
  }

  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 1);

  const expenses = await prisma.expense.findMany({
    where: { date: { gte: start, lt: end } },
    orderBy: { date: "asc" },
  });

  return NextResponse.json(expenses);
}

export async function POST(req: NextRequest) {
  const { userId, sessionClaims } = await auth();
  const role = (sessionClaims?.metadata as { role?: string })?.role;
  if (role !== "admin" && role !== "director" && role !== "teacher-admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { description, price, date } = await req.json();

  const expense = await prisma.expense.create({
    data: {
      description,
      price: parseFloat(price),
      date: new Date(date),
      userId: userId!,
    },
  });

  return NextResponse.json(expense, { status: 201 });
}
