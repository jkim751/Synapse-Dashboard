import { NextRequest, NextResponse } from 'next/server';
import xero, { storeTokens } from '@/lib/xero';
import { auth } from '@clerk/nextjs/server';

// Initiate OAuth flow
export async function GET() {
  try {
    const consentUrl = await xero.buildConsentUrl();
    return NextResponse.redirect(consentUrl);
  } catch (error) {
    console.error('Error building consent URL:', error);
    return NextResponse.json({ error: 'Failed to initiate OAuth' }, { status: 500 });
  }
}

// Handle OAuth callback from our frontend page
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'User is not authenticated' }, { status: 401 });
    }

    const { code } = await request.json(); // Read code from the request BODY

    if (!code) {
      return NextResponse.json({ error: 'No authorization code provided' }, { status: 400 });
    }

    // Exchange code for tokens
    const tokenSet = await xero.apiCallback(code);
    
    // Store tokens in database against the logged-in user
    await storeTokens(userId, tokenSet);

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('Error in OAuth callback:', error);
    return NextResponse.json({ error: 'OAuth callback failed', details: error.message }, { status: 500 });
  }
}