import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getAnyXeroClient } from '@/lib/xero';

export async function GET(req: NextRequest) {
  try {
    const { userId, sessionClaims } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const role = (sessionClaims?.metadata as { role?: string })?.role;
    if (role !== 'teacher' && role !== 'admin' && role !== 'director' && role !== 'teacher-admin') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const payslipId = req.nextUrl.searchParams.get('payslipId');
    if (!payslipId) return NextResponse.json({ error: 'Missing payslipId' }, { status: 400 });

    const xero = await getAnyXeroClient();
    // Refresh token to ensure it's valid before raw fetch
    await xero.refreshToken();
    const tenantId = xero.tenants[0].tenantId;
    const accessToken = xero.readTokenSet().access_token;

    const res = await fetch(
      `https://api.xero.com/payroll.xro/1.0/Payslip/${encodeURIComponent(payslipId)}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Xero-Tenant-Id': tenantId,
          Accept: 'application/pdf',
        },
      }
    );

    if (!res.ok) {
      const text = await res.text();
      console.error('Xero payslip PDF error:', res.status, text);
      return NextResponse.json({ error: 'Failed to fetch payslip PDF from Xero' }, { status: res.status });
    }

    const contentType = res.headers.get('content-type') ?? '';
    const buffer = await res.arrayBuffer();

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType.includes('pdf') ? 'application/pdf' : contentType,
        'Content-Disposition': `attachment; filename="payslip-${payslipId}.pdf"`,
      },
    });

  } catch (error: any) {
    console.error('Payslip download error:', error?.message);
    return NextResponse.json({ error: 'Failed to download payslip' }, { status: 500 });
  }
}
