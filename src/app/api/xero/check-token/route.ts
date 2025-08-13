import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getStoredTokens } from '@/lib/xero';

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ isAuthenticated: false });
    }
    const token = await getStoredTokens(userId);
    return NextResponse.json({ isAuthenticated: !!token });
  } catch (error) {
    return NextResponse.json({ isAuthenticated: false });
  }
}