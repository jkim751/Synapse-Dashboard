import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';

async function requireDirector() {
  const { sessionClaims } = await auth();
  const role = (sessionClaims?.metadata as { role?: string })?.role;
  if (role !== 'director') return null;
  return role;
}

export async function GET() {
  const { sessionClaims } = await auth();
  const role = (sessionClaims?.metadata as { role?: string })?.role;
  if (role !== 'admin' && role !== 'director' && role !== 'teacher-admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const items = await prisma.recurringExpense.findMany({
    orderBy: { createdAt: 'asc' },
  });
  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  if (!await requireDirector()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { description, price, frequency, nextDate } = await req.json();
  const item = await prisma.recurringExpense.create({
    data: { description, price: parseFloat(price), frequency, nextDate: nextDate || null },
  });
  return NextResponse.json(item, { status: 201 });
}
