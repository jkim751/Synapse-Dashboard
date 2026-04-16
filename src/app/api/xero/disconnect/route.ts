import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { deleteTokens } from '@/lib/xero';

export async function POST() {
  const { userId, sessionClaims } = await auth();
  const role = (sessionClaims?.metadata as { role?: string })?.role;

  if (!userId || (role !== 'admin' && role !== 'director')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await deleteTokens(userId);
  return NextResponse.json({ success: true });
}
