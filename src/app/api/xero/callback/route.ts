import { NextRequest, NextResponse } from 'next/server';
import xero, { storeTokens } from '@/lib/xero';
import { auth } from '@clerk/nextjs/server';

// Handle GET OAuth callback from Xero
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      console.log("No authenticated user found");
      return NextResponse.redirect(new URL('/sign-in', req.url));
    }

    console.log("Xero callback URL received:", req.url);
    console.log("User ID:", userId);

    // Extract the URL search parameters for debugging
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const error = url.searchParams.get('error');

    console.log("Callback parameters:", { code: code?.substring(0, 10) + '...', state, error });

    if (error) {
      console.error("Xero returned error:", error);
      return NextResponse.redirect(new URL(`/admin/xero?error=xero_${error}`, req.url));
    }

    if (!code) {
      console.error("No authorization code in callback");
      return NextResponse.redirect(new URL('/admin/xero?error=no_code', req.url));
    }

    console.log("Attempting token exchange with Xero...");

    // Exchange code for tokens directly from Xero
    const tokenSet = await xero.apiCallback(req.url);

    console.log("Raw token set from Xero:", JSON.stringify(tokenSet, null, 2));
    console.log("Token set type:", typeof tokenSet);
    console.log("Token set keys:", Object.keys(tokenSet || {}));

    // Check if tokenSet is valid
    if (!tokenSet) {
      console.error("Received null/undefined token set from Xero");
      return NextResponse.redirect(new URL('/admin/xero?error=null_tokenset', req.url));
    }

    // Check if we have the required fields before storing
    if (!tokenSet.access_token || !tokenSet.refresh_token || !tokenSet.expires_at) {
      console.error("Invalid token set from Xero - missing required fields:", {
        has_access_token: !!tokenSet.access_token,
        access_token_type: typeof tokenSet.access_token,
        access_token_length: tokenSet.access_token?.length,
        has_refresh_token: !!tokenSet.refresh_token,
        has_expires_at: !!tokenSet.expires_at,
        expires_at_value: tokenSet.expires_at,
        expires_at_type: typeof tokenSet.expires_at,
        all_keys: Object.keys(tokenSet),
        full_tokenset: tokenSet
      });
      return NextResponse.redirect(new URL('/admin/xero?error=invalid_token', req.url));
    }

    console.log("Token set validation passed, storing tokens...");

    // Save tokens in database
    await storeTokens(userId, tokenSet);

    console.log("Tokens stored successfully, redirecting to success page");

    // Redirect to success page
    return NextResponse.redirect(new URL('/admin/xero?success=true', req.url));

  } catch (error: any) {
    console.error('Error in OAuth callback:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    return NextResponse.redirect(new URL('/admin/xero?error=callback_failed', req.url));
  }
}