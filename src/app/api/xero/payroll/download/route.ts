import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getAnyXeroClient } from '@/lib/xero';

const fmt = (n: number) =>
  new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(n);

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' });

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
    const tenantId = xero.tenants[0].tenantId;

    const slipRes = await xero.payrollAUApi.getPayslip(tenantId, payslipId);
    const payslip = slipRes.body.payslip as any;
    if (!payslip) return NextResponse.json({ error: 'Payslip not found' }, { status: 404 });

    const earningsLines: any[] = payslip.earningsLines ?? [];
    const deductionLines: any[] = payslip.deductionLines ?? [];
    const leaveLines: any[] = payslip.leaveAccrualLines ?? [];
    const totalDeductions = deductionLines.reduce((s: number, d: any) => s + (d.amount ?? 0), 0);

    const periodStart = payslip.payPeriodStartDate ? fmtDate(payslip.payPeriodStartDate) : '';
    const periodEnd = payslip.payPeriodEndDate ? fmtDate(payslip.payPeriodEndDate) : '';

    const earningsRows = earningsLines.map((e: any) => `
      <tr>
        <td>${e.earningsRateName ?? e.calculationType ?? '—'}</td>
        <td>${e.numberOfUnits != null ? (Array.isArray(e.numberOfUnits) ? e.numberOfUnits[0] : e.numberOfUnits) : '—'}</td>
        <td>${e.ratePerUnit != null ? fmt(e.ratePerUnit) : '—'}</td>
        <td class="amount">${e.amount != null ? fmt(e.amount) : '—'}</td>
      </tr>`).join('');

    const deductionRows = deductionLines.map((d: any) => `
      <tr>
        <td>${d.deductionTypeName ?? '—'}</td>
        <td class="amount">−${fmt(d.amount ?? 0)}</td>
      </tr>`).join('');

    const leaveRows = leaveLines.map((l: any) => `
      <tr>
        <td>${l.leaveTypeID ?? '—'}</td>
        <td>${l.numberOfUnits != null ? l.numberOfUnits : '—'} hrs</td>
      </tr>`).join('');

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Payslip ${periodStart} – ${periodEnd}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; font-size: 13px; color: #222; padding: 32px; max-width: 720px; margin: 0 auto; }
    h1 { font-size: 20px; margin-bottom: 4px; }
    .period { color: #666; margin-bottom: 24px; }
    h2 { font-size: 14px; font-weight: 600; margin: 20px 0 8px; border-bottom: 1px solid #ddd; padding-bottom: 4px; }
    table { width: 100%; border-collapse: collapse; }
    th, td { text-align: left; padding: 6px 8px; border-bottom: 1px solid #eee; }
    th { background: #f5f5f5; font-weight: 600; }
    td.amount, th.amount { text-align: right; }
    .summary { margin-top: 24px; border: 2px solid #222; border-radius: 4px; padding: 16px; display: flex; justify-content: space-between; }
    .summary div { text-align: center; }
    .summary .label { font-size: 11px; color: #666; margin-bottom: 4px; }
    .summary .value { font-size: 18px; font-weight: 700; }
    .net { color: #16a34a; }
    @media print { body { padding: 16px; } }
  </style>
</head>
<body>
  <h1>Payslip</h1>
  <p class="period">Pay period: ${periodStart} – ${periodEnd}</p>

  <h2>Earnings</h2>
  <table>
    <thead><tr><th>Description</th><th>Units</th><th>Rate</th><th class="amount">Amount</th></tr></thead>
    <tbody>${earningsRows || '<tr><td colspan="4">No earnings lines</td></tr>'}</tbody>
  </table>

  ${deductionLines.length > 0 ? `
  <h2>Deductions</h2>
  <table>
    <thead><tr><th>Description</th><th class="amount">Amount</th></tr></thead>
    <tbody>${deductionRows}</tbody>
  </table>` : ''}

  ${leaveLines.length > 0 ? `
  <h2>Leave Accruals</h2>
  <table>
    <thead><tr><th>Leave Type</th><th>Units</th></tr></thead>
    <tbody>${leaveRows}</tbody>
  </table>` : ''}

  <div class="summary">
    <div>
      <div class="label">Gross Pay</div>
      <div class="value">${fmt(payslip.wages ?? 0)}</div>
    </div>
    <div>
      <div class="label">Deductions</div>
      <div class="value">−${fmt(totalDeductions)}</div>
    </div>
    <div>
      <div class="label">Net Pay</div>
      <div class="value net">${fmt(payslip.netPay ?? 0)}</div>
    </div>
  </div>
</body>
</html>`;

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `attachment; filename="payslip-${periodStart.replace(/\s/g, '-')}.html"`,
      },
    });

  } catch (error: any) {
    console.error('Payslip download error:', error?.response?.body ?? error?.message);
    return NextResponse.json({ error: 'Failed to download payslip' }, { status: 500 });
  }
}
