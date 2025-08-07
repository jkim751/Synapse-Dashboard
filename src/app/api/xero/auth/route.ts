
import { NextRequest, NextResponse } from 'next/server';
import xero, { storeTokens } from '@/lib/xero';
import { auth } from '@clerk/nextjs/server';

// Initiate OAuth flow
export async function GET() {
  try {
    const authUrl = await xero.buildConsentUrl();
    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error('Error building consent URL:', error);
    return NextResponse.json({ error: 'Failed to initiate OAuth' }, { status: 500 });
  }
}

// Handle OAuth callback
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');

    if (!code) {
      return NextResponse.json({ error: 'No authorization code provided' }, { status: 400 });
    }

    // Exchange code for tokens
    const tokenSet = await xero.apiCallback(request.url);
    
    // Store tokens in database
    await storeTokens(tokenSet, userId || undefined);

    return NextResponse.json({ success: true, message: 'Xero authentication successful' });
  } catch (error) {
    console.error('Error in OAuth callback:', error);
    return NextResponse.json({ error: 'OAuth callback failed' }, { status: 500 });
  }
}
