
// import { NextRequest, NextResponse } from 'next/server';
// import xero, { storeTokens } from '@/lib/xero';
// import { auth } from '@clerk/nextjs/server';

// // Initiate OAuth flow
// export async function GET(request: NextRequest) {
//   try {
//     const { searchParams } = new URL(request.url);
//     const code = searchParams.get('code');
    
//     // If we have a code, this is the callback
//     if (code) {
//       return handleCallback(request);
//     }
    
//     // Otherwise, initiate OAuth flow
//     const authUrl = await xero.buildConsentUrl();
//     return NextResponse.redirect(authUrl);
//   } catch (error) {
//     console.error('Error in OAuth flow:', error);
//     return NextResponse.json({ error: 'Failed to initiate OAuth' }, { status: 500 });
//   }
// }

// // Handle OAuth callback
// async function handleCallback(request: NextRequest) {
//   try {
//     const { userId } = await auth();
//     const { searchParams } = new URL(request.url);
//     const code = searchParams.get('code');
//     const state = searchParams.get('state');

//     if (!code) {
//       return NextResponse.json({ error: 'No authorization code provided' }, { status: 400 });
//     }

//     // Exchange code for tokens
//     const tokenSet = await xero.apiCallback(request.url);
    
//     // Store tokens in database
//     await storeTokens(tokenSet, userId || undefined);

//     // Redirect back to Xero dashboard with success message
//     return NextResponse.redirect(new URL('/list/xero?success=true', request.url));
//   } catch (error) {
//     console.error('Error in OAuth callback:', error);
//     return NextResponse.redirect(new URL('/list/xero?error=auth_failed', request.url));
//   }
// }
