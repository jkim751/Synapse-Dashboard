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

    // 1. Read the full callback URL from the request body
    const { callbackUrl } = await request.json(); 

    if (!callbackUrl) {
      return NextResponse.json({ error: 'No callback URL provided' }, { status: 400 });
    }

    // 2. Pass the entire URL directly to the apiCallback function
    const tokenSet = await xero.apiCallback(callbackUrl);
    
    // 3. Store the tokens against the logged-in user
    await storeTokens(userId, tokenSet);

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('Error in OAuth callback:', error);
    // This is where your log is coming from. Now it will show the real underlying error.
    return NextResponse.json({ error: 'OAuth callback failed', details: error.message }, { status: 500 });
  }
}