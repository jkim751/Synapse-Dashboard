import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import xero, { storeTokens } from '@/lib/xero';

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    console.log('Xero callback received:', {
      url: request.url,
      code: code ? 'present' : 'missing',
      state: state ? 'present' : 'missing',
      error,
      errorDescription,
      allParams: Object.fromEntries(searchParams.entries())
    });

    if (error) {
      console.error('Xero OAuth error:', error, errorDescription);
      return NextResponse.redirect(
        new URL('/admin/xero?error=' + encodeURIComponent(errorDescription || error), request.url)
      );
    }

    if (!code) {
      console.error('Authorization code missing. Full URL:', request.url);
      return NextResponse.redirect(
        new URL('/admin/xero?error=' + encodeURIComponent('Authorization code not received from Xero'), request.url)
      );
    }

    const tokenSet = await xero.apiCallback(request.url);
    
    await storeTokens(userId, tokenSet);

    return NextResponse.redirect(new URL('/admin/xero?success=true', request.url));
    
  } catch (error: any) {
    console.error('Xero callback error:', error);
    return NextResponse.redirect(
      new URL('/admin/xero?error=' + encodeURIComponent(error.message), request.url)
    );
  }
}