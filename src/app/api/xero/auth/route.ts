import { NextRequest, NextResponse } from 'next/server';
import xero from '@/lib/xero';
import { auth } from '@clerk/nextjs/server';

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'User is not authenticated' }, { status: 401 });
    }

    console.log("Generating Xero consent URL for user:", userId);

    // Generate the consent URL
    const consentUrl = await xero.buildConsentUrl();
    
    console.log("Generated consent URL:", consentUrl);
    console.log("Configured redirect URI:", process.env.XERO_REDIRECT_URI);

    // Redirect user to Xero for authentication
    return NextResponse.redirect(consentUrl);

  } catch (error: any) {
    console.error('Error generating Xero auth URL:', error);
    return NextResponse.json(
      { error: 'Failed to generate auth URL', details: error.message },
      { status: 500 }
    );
  }
}