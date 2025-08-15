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
    if (token && token.expires_at > Math.floor(Date.now() / 1000)) {
      return NextResponse.json({ isAuthenticated: true });
    }
    return NextResponse.json({ isAuthenticated: false });
  } catch (error) {
    return NextResponse.json({ isAuthenticated: false });
  }
}