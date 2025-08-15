import { NextRequest, NextResponse } from 'next/server';
import xero, { storeTokens } from '@/lib/xero';
import { auth } from '@clerk/nextjs/server';

// Handle GET OAuth callback from Xero
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      // Redirect to login instead of returning JSON for better UX
      return NextResponse.redirect(new URL('/sign-in', req.url));
    }

    console.log("Xero callback URL received:", req.url);

    // Exchange code for tokens directly from Xero
    const tokenSet = await xero.apiCallback(req.url);

    console.log("Token set from Xero:", tokenSet);

    // Check if we have the required fields before storing
    if (!tokenSet.access_token || !tokenSet.refresh_token || !tokenSet.expires_at) {
      console.error("Invalid token set from Xero - missing required fields:", {
        has_access_token: !!tokenSet.access_token,
        has_refresh_token: !!tokenSet.refresh_token,
        has_expires_at: !!tokenSet.expires_at,
        full_tokenset: tokenSet
      });
      return NextResponse.redirect(new URL('/admin/xero?error=invalid_token', req.url));
    }

    // Save tokens in database
    await storeTokens(userId, tokenSet);

    // Redirect to success page
    return NextResponse.redirect(new URL('/admin/xero?success=true', req.url));

  } catch (error: any) {
    console.error('Error in OAuth callback:', error);
    return NextResponse.redirect(new URL('/admin/xero?error=callback_failed', req.url));
  }
}