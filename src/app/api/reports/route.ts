import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';

async function requireDirector() {
  const { userId, sessionClaims } = await auth();
  const role = (sessionClaims?.metadata as { role?: string })?.role;
  if (!userId || role !== 'director') return null;
  return userId;
}

export async function GET(req: NextRequest) {
  const directorId = await requireDirector();
  if (!directorId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const staffId = req.nextUrl.searchParams.get('staffId');
  const reports = await prisma.staffReport.findMany({
    where: staffId ? { staffId } : undefined,
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json(reports);
}

export async function POST(req: NextRequest) {
  const directorId = await requireDirector();
  if (!directorId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { staffId, staffType, subject, content } = await req.json();
  if (!staffId || !subject?.trim() || !content?.trim()) {
    return NextResponse.json({ error: 'staffId, subject and content are required' }, { status: 400 });
  }

  const report = await prisma.staffReport.create({
    data: { staffId, staffType, subject, content, createdBy: directorId },
  });
  return NextResponse.json(report, { status: 201 });
}
