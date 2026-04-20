import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getAnyXeroClient } from '@/lib/xero';

const fmt = (n: number | null | undefined) =>
  new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(n ?? 0);

const fmtDate = (d: any): string => {
  if (!d) return '—';
  const s = String(d);
  const match = s.match(/\/Date\((-?\d+)[\+\-]\d+\)\//);
  const dt = match ? new Date(parseInt(match[1], 10)) : new Date(s);
  return isNaN(dt.getTime()) ? '—' : dt.toLocaleDateString('en-AU', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const fmtDateLong = (d: any): string => {
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

    // Try the official Xero PDF first
    const accessToken = xero.readTokenSet().access_token;
    const pdfRes = await fetch(
      `https://api.xero.com/payroll.xro/1.0/Payslips/${payslipId}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Xero-Tenant-Id': tenantId,
          Accept: 'application/pdf',
        },
      }
    );

    if (pdfRes.ok && pdfRes.headers.get('content-type')?.includes('application/pdf')) {
      const pdfBuffer = await pdfRes.arrayBuffer();
      return new NextResponse(pdfBuffer, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `inline; filename="payslip-${payslipId}.pdf"`,
        },
      });
    }

    // Fall back: render HTML that mirrors the Xero payslip layout
    const slipRes = await xero.payrollAUApi.getPayslip(tenantId, payslipId);
    const p = slipRes.body.payslip as any;
    if (!p) return NextResponse.json({ error: 'Payslip not found' }, { status: 404 });

    const earningsLines: any[] = p.earningsLines ?? [];
    const taxLines: any[] = p.taxLines ?? [];
    const superLines: any[] = p.superLines ?? [];
    const paymentLines: any[] = p.paymentLines ?? [];
    const deductionLines: any[] = p.deductionLines ?? [];
    const leaveLines: any[] = p.leaveAccrualLines ?? [];

    const employeeName = `${p.firstName ?? ''} ${p.lastName ?? ''}`.trim();
    const grossPay = p.wages ?? 0;
    const netPay = p.netPay ?? 0;

    const earningsTotal = earningsLines.reduce((s: number, l: any) => s + (l.amount ?? 0), 0);
    const taxTotal = taxLines.reduce((s: number, l: any) => s + (l.amount ?? 0), 0);
    const superTotal = superLines.reduce((s: number, l: any) => s + (l.amount ?? 0), 0);

    const tableRow = (cols: string[], bold = false) =>
      `<tr class="${bold ? 'total-row' : ''}">${cols.map((c, i) => `<td class="${i > 0 ? 'num' : ''}">${c}</td>`).join('')}</tr>`;

    const earningsRows = earningsLines.map(l => {
      const units = Array.isArray(l.numberOfUnits)
        ? (l.numberOfUnits as number[]).reduce((a: number, b: number) => a + b, 0)
        : (l.numberOfUnits ?? null);
      return tableRow([
        l.earningsRateName ?? l.calculationType ?? '—',
        units != null ? units.toFixed(4) : '',
        l.ratePerUnit != null ? `$${Number(l.ratePerUnit).toFixed(4)}` : '',
        fmt(l.amount),
        l.ytdAmount != null ? fmt(l.ytdAmount) : '—',
      ]);
    }).join('');

    const taxRows = taxLines.map((l: any) =>
      tableRow([l.manualTax ? 'Manual Tax' : 'PAYG', '', '', fmt(l.amount), l.ytdAmount != null ? fmt(l.ytdAmount) : '—'])
    ).join('');

    const superRows = superLines.map((l: any) =>
      tableRow([l.superMembershipNumber ?? l.superFundID ?? '—', '', '', fmt(l.amount), l.ytdAmount != null ? fmt(l.ytdAmount) : '—'])
    ).join('');

    const paymentRows = paymentLines.map((l: any) =>
      `<tr>
        <td>${l.bankAccountNumber ?? '—'}</td>
        <td>${l.bankAccountName ?? employeeName}</td>
        <td class="num">Pay Cheque</td>
        <td class="num">${fmt(l.amount)}</td>
      </tr>`
    ).join('');

    const deductionRows = deductionLines.map((l: any) =>
      tableRow([l.deductionTypeName ?? '—', '', '', fmt(l.amount), l.ytdAmount != null ? fmt(l.ytdAmount) : '—'])
    ).join('');

    const leaveRows = leaveLines.map((l: any) =>
      `<tr><td>${l.leaveTypeID ?? '—'}</td><td class="num">${(l.numberOfUnits ?? 0)} hrs</td><td></td><td></td><td></td></tr>`
    ).join('');

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>Payslip — ${employeeName}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:Arial,sans-serif;font-size:12px;color:#111;background:#fff;padding:32px;max-width:820px;margin:0 auto}
    .top{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px}
    .top img{width:100px}
    .top-right{display:flex;flex-direction:column;gap:8px;text-align:left;min-width:260px}
    .box{background:#f5f5f5;padding:12px 16px;font-size:11px;line-height:1.7}
    .box strong{display:block;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px}
    .employee{margin:20px 0;font-size:13px;line-height:1.7}
    .employee .name{font-size:18px;margin-bottom:4px}
    .summary-bar{display:grid;grid-template-columns:repeat(4,1fr);border:1px solid #ddd;margin:20px 0}
    .summary-bar .cell{padding:10px 14px;border-right:1px solid #ddd;font-size:11px}
    .summary-bar .cell:last-child{border-right:none}
    .summary-bar .cell label{display:block;color:#555;margin-bottom:2px}
    .summary-bar .cell span{font-weight:700;font-size:13px}
    .section{margin-bottom:20px}
    .section-title{font-weight:700;font-size:11px;text-transform:uppercase;letter-spacing:.04em;padding:8px 0 4px}
    table{width:100%;border-collapse:collapse}
    th{font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.04em;color:#555;padding:5px 8px;border-bottom:1px solid #ddd;text-align:left}
    th.num,td.num{text-align:right}
    td{padding:6px 8px;border-bottom:1px solid #f0f0f0;font-size:12px}
    tr.total-row td{background:#f5f5f5;font-weight:700;border-top:1px solid #ddd;border-bottom:1px solid #ddd}
    .print-btn{display:block;margin:28px auto 0;padding:10px 28px;background:#f97316;color:#fff;border:none;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer}
    @media print{.print-btn{display:none}body{padding:0}}
  </style>
</head>
<body>

  <div class="top">
    <img src="https://synapseeducation.com.au/email.png" alt="Synapse Education" />
    <div class="top-right">
      <div class="box">
        <strong>Paid By</strong>
        Synapse Education Pty Ltd<br/>
        Suite 305 160 Rowe St<br/>
        EASTWOOD NSW 2122<br/>
        ABN 66 678 906 093
      </div>
      <div class="box">
        <strong>Employment Details</strong>
        Pay Frequency: Fortnightly
      </div>
    </div>
  </div>

  <div class="employee">
    <div class="name">${employeeName}</div>
  </div>

  <div class="summary-bar">
    <div class="cell"><label>Pay Period</label><span>${fmtDate(p.payPeriodStartDate)} – ${fmtDate(p.payPeriodEndDate)}</span></div>
    <div class="cell"><label>Payment Date</label><span>${fmtDateLong(p.paymentDate)}</span></div>
    <div class="cell"><label>Total Earnings</label><span>${fmt(grossPay)}</span></div>
    <div class="cell"><label>Net Pay</label><span>${fmt(netPay)}</span></div>
  </div>

  ${earningsLines.length > 0 ? `
  <div class="section">
    <div class="section-title">Salary &amp; Wages</div>
    <table>
      <thead><tr><th>Description</th><th>Hours</th><th>Rate</th><th class="num">This Pay</th><th class="num">YTD</th></tr></thead>
      <tbody>
        ${earningsRows}
        ${tableRow(['', '', 'Total', fmt(earningsTotal), ''], true)}
      </tbody>
    </table>
  </div>` : ''}

  ${taxLines.length > 0 ? `
  <div class="section">
    <div class="section-title">Tax</div>
    <table>
      <thead><tr><th>Description</th><th></th><th></th><th class="num">This Pay</th><th class="num">YTD</th></tr></thead>
      <tbody>
        ${taxRows}
        ${tableRow(['', '', 'Total', fmt(taxTotal), ''], true)}
      </tbody>
    </table>
  </div>` : ''}

  ${superLines.length > 0 ? `
  <div class="section">
    <div class="section-title">Superannuation</div>
    <table>
      <thead><tr><th>Fund</th><th></th><th></th><th class="num">This Pay</th><th class="num">YTD</th></tr></thead>
      <tbody>
        ${superRows}
        ${tableRow(['', '', 'Total', fmt(superTotal), ''], true)}
      </tbody>
    </table>
  </div>` : ''}

  ${deductionLines.length > 0 ? `
  <div class="section">
    <div class="section-title">Deductions</div>
    <table>
      <thead><tr><th>Description</th><th></th><th></th><th class="num">This Pay</th><th class="num">YTD</th></tr></thead>
      <tbody>${deductionRows}</tbody>
    </table>
  </div>` : ''}

  ${leaveLines.length > 0 ? `
  <div class="section">
    <div class="section-title">Leave Accruals</div>
    <table>
      <thead><tr><th>Leave Type</th><th class="num">Units</th><th></th><th></th><th></th></tr></thead>
      <tbody>${leaveRows}</tbody>
    </table>
  </div>` : ''}

  ${paymentLines.length > 0 ? `
  <div class="section">
    <div class="section-title">Payment Details</div>
    <table>
      <thead><tr><th>Account</th><th>Name</th><th class="num">Reference</th><th class="num">Amount</th></tr></thead>
      <tbody>${paymentRows}</tbody>
    </table>
  </div>` : ''}

  <button class="print-btn" onclick="window.print()">Print / Save as PDF</button>
</body>
</html>`;

    return new NextResponse(html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });

  } catch (error: any) {
    console.error('Payslip download error:', error?.response?.body ?? error?.message);
    return NextResponse.json({ error: 'Failed to load payslip' }, { status: 500 });
  }
}
