import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import xero from '@/lib/xero';

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const consentUrl = await xero.buildConsentUrl();
    
    return NextResponse.json({ authUrl: consentUrl });
    
  } catch (error: any) {
    console.error('Error generating Xero auth URL:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate auth URL' },
      { status: 500 }
    );
  }
}
