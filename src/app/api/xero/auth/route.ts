import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { buildConsentUrl } from '@/lib/xero';

export async function GET() {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 });
    }

    console.log('=== GENERATING XERO AUTH URL ===');
    console.log('User ID:', userId);
    console.log('Redirect URI configured:', process.env.XERO_REDIRECT_URI);
    
    const consentUrl = await buildConsentUrl();
    
    console.log('Generated consent URL:', consentUrl);
    
    // Verify the redirect_uri is in the URL
    const url = new URL(consentUrl);
    const redirectUriParam = url.searchParams.get('redirect_uri');
    console.log('redirect_uri in consent URL:', redirectUriParam);
    
    if (redirectUriParam !== process.env.XERO_REDIRECT_URI) {
      console.error('MISMATCH: redirect_uri in URL does not match environment variable!');
    }
    
    console.log('=== END XERO AUTH URL ===');

    return NextResponse.json({ url: consentUrl });
  } catch (error: any) {
    console.error('Error generating Xero auth URL:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
