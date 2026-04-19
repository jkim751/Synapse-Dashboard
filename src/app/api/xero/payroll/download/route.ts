import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getAnyXeroClient } from '@/lib/xero';

const fmt = (n: number) =>
  new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(n);

const fmtDate = (d: any): string => {
  if (!d) return '—';
  const s = String(d);
  const match = s.match(/\/Date\((-?\d+)[\+\-]\d+\)\//);
  const dt = match ? new Date(parseInt(match[1], 10)) : new Date(s);
  return isNaN(dt.getTime()) ? '—' : dt.toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' });
};

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
    const superLines: any[] = payslip.superLines ?? [];
    const totalDeductions = deductionLines.reduce((s: number, d: any) => s + (d.amount ?? 0), 0);

    const periodStart = fmtDate(payslip.payPeriodStartDate);
    const periodEnd = fmtDate(payslip.payPeriodEndDate);
    const employeeName = `${payslip.firstName ?? ''} ${payslip.lastName ?? ''}`.trim();

    const rows = (lines: any[], cells: (l: any) => string[]) =>
      lines.map(l => `<tr>${cells(l).map(c => `<td>${c}</td>`).join('')}</tr>`).join('');

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>Payslip — ${employeeName}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:Arial,sans-serif;font-size:13px;color:#111;padding:40px;max-width:760px;margin:0 auto}
    header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:28px;padding-bottom:16px;border-bottom:2px solid #111}
    header h1{font-size:22px;font-weight:700}
    header .meta{text-align:right;font-size:12px;color:#555;line-height:1.7}
    h2{font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#555;margin:20px 0 6px}
    table{width:100%;border-collapse:collapse;margin-bottom:4px}
    th{text-align:left;font-size:11px;font-weight:600;color:#555;padding:5px 8px;background:#f5f5f5;border-bottom:1px solid #ddd}
    td{padding:6px 8px;border-bottom:1px solid #eee;font-size:12px}
    td:last-child,th:last-child{text-align:right}
    .summary{margin-top:24px;display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
    .summary-box{border:1px solid #ddd;border-radius:6px;padding:14px}
    .summary-box .label{font-size:11px;color:#666;margin-bottom:4px}
    .summary-box .value{font-size:18px;font-weight:700}
    .net .value{color:#16a34a}
    .print-btn{display:block;margin:28px auto 0;padding:10px 28px;background:#f97316;color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer}
    @media print{.print-btn{display:none}}
  </style>
</head>
<body>
  <header>
    <div>
      <h1>${employeeName}</h1>
      <div style="font-size:12px;color:#555;margin-top:4px">Payslip</div>
    </div>
    <div class="meta">
      <div><strong>Pay period</strong></div>
      <div>${periodStart} – ${periodEnd}</div>
      ${payslip.paymentDate ? `<div style="margin-top:4px"><strong>Payment date</strong></div><div>${fmtDate(payslip.paymentDate)}</div>` : ''}
    </div>
  </header>

  ${earningsLines.length > 0 ? `
  <h2>Earnings</h2>
  <table>
    <thead><tr><th>Description</th><th>Units</th><th>Rate</th><th>Amount</th></tr></thead>
    <tbody>${rows(earningsLines, l => [
      l.earningsRateName ?? l.calculationType ?? '—',
      l.numberOfUnits != null ? (Array.isArray(l.numberOfUnits) ? (l.numberOfUnits as number[]).reduce((a: number, b: number) => a + b, 0) : l.numberOfUnits) + ' hrs' : '—',
      l.ratePerUnit != null ? fmt(l.ratePerUnit) + '/hr' : '—',
      l.amount != null ? fmt(l.amount) : '—',
    ])}</tbody>
  </table>` : ''}

  ${deductionLines.length > 0 ? `
  <h2>Deductions</h2>
  <table>
    <thead><tr><th>Description</th><th>Amount</th></tr></thead>
    <tbody>${rows(deductionLines, l => [l.deductionTypeName ?? '—', fmt(l.amount ?? 0)])}</tbody>
  </table>` : ''}

  ${superLines.length > 0 ? `
  <h2>Superannuation</h2>
  <table>
    <thead><tr><th>Fund</th><th>Amount</th></tr></thead>
    <tbody>${rows(superLines, l => [l.superMembershipNumber ?? l.superFundID ?? '—', fmt(l.amount ?? 0)])}</tbody>
  </table>` : ''}

  ${leaveLines.length > 0 ? `
  <h2>Leave Accruals</h2>
  <table>
    <thead><tr><th>Leave Type</th><th>Units</th></tr></thead>
    <tbody>${rows(leaveLines, l => [l.leaveTypeID ?? '—', (l.numberOfUnits ?? 0) + ' hrs'])}</tbody>
  </table>` : ''}

  <div class="summary">
    <div class="summary-box">
      <div class="label">Gross Pay</div>
      <div class="value">${fmt(payslip.wages ?? 0)}</div>
    </div>
    <div class="summary-box">
      <div class="label">Total Deductions</div>
      <div class="value">−${fmt(totalDeductions)}</div>
    </div>
    <div class="summary-box net">
      <div class="label">Net Pay</div>
      <div class="value">${fmt(payslip.netPay ?? 0)}</div>
    </div>
  </div>

  <button class="print-btn" onclick="window.print()">Print / Save as PDF</button>
</body>
</html>`;

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
    });

  } catch (error: any) {
    console.error('Payslip download error:', error?.response?.body ?? error?.message);
    return NextResponse.json({ error: 'Failed to load payslip' }, { status: 500 });
  }
}
