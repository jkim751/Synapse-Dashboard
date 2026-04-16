import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { getAnyXeroClient } from '@/lib/xero';

// Match a local teacher to a Xero employee record by email (preferred) then full name.
function matchEmployee(employees: any[], email: string | null | undefined, name: string, surname: string): any | null {
  const fullName = `${name} ${surname}`.toLowerCase().trim();

  if (email) {
    const byEmail = employees.find(
      (e: any) => e.email?.toLowerCase().trim() === email.toLowerCase().trim()
    );
    if (byEmail) return byEmail;
  }

  // Fall back to full name match
  const byName = employees.find((e: any) => {
    const xeroName = `${e.firstName ?? ''} ${e.lastName ?? ''}`.toLowerCase().trim();
    return xeroName === fullName;
  });
  return byName ?? null;
}

export async function GET() {
  try {
    const { userId, sessionClaims } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const role = (sessionClaims?.metadata as { role?: string })?.role;

    if (role !== 'teacher' && role !== 'admin' && role !== 'director') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const teacher = await prisma.teacher.findUnique({
      where: { id: userId },
      select: { name: true, surname: true, email: true, xeroEmployeeId: true },
    });

    if (!teacher) {
      return NextResponse.json({ error: 'Teacher not found.' }, { status: 404 });
    }

    const xero = await getAnyXeroClient();
    const activeTenantId = xero.tenants[0].tenantId;

    // Resolve Xero employee ID — use stored ID if available, otherwise match by email/name
    let employeeId = teacher.xeroEmployeeId ?? null;

    if (!employeeId) {
      const employeesResponse = await xero.payrollAUApi.getEmployees(activeTenantId);
      const employees = employeesResponse.body.employees ?? [];
      const matched = matchEmployee(employees, teacher.email, teacher.name, teacher.surname);

      if (!matched?.employeeID) {
        return NextResponse.json(
          { error: 'Could not match this teacher to a Xero Payroll employee. Check that the name or email matches.' },
          { status: 404 }
        );
      }

      employeeId = matched.employeeID;

      // Persist the match so future calls skip this lookup
      await prisma.teacher.update({
        where: { id: userId },
        data: { xeroEmployeeId: employeeId },
      });
    }

    // Fetch recent pay runs and find this employee's payslip
    const payRunsResponse = await xero.payrollAUApi.getPayRuns(activeTenantId);
    const payRuns = payRunsResponse.body.payRuns ?? [];

    const sortedRuns = [...payRuns]
      .filter((r: any) => r.payRunStatus === 'POSTED' || r.payRunStatus === 'DRAFT')
      .sort((a: any, b: any) => {
        const aDate = a.paymentDate ? new Date(a.paymentDate).getTime() : 0;
        const bDate = b.paymentDate ? new Date(b.paymentDate).getTime() : 0;
        return bDate - aDate;
      });

    if (sortedRuns.length === 0) {
      return NextResponse.json({ error: 'No pay runs found in Xero.' }, { status: 404 });
    }

    let payslip: any = null;
    for (const run of sortedRuns.slice(0, 5)) {
      const runId = (run as any).payRunID;
      if (!runId) continue;
      const slipsResponse = await xero.payrollAUApi.getPayRunPaySlips(activeTenantId, runId);
      const slips = slipsResponse.body.payslips ?? [];
      const found = slips.find((s: any) => s.employeeID === employeeId);
      if (found) {
        payslip = found;
        break;
      }
    }

    if (!payslip) {
      return NextResponse.json(
        { error: 'No payslip found for this employee in recent pay runs.' },
        { status: 404 }
      );
    }

    const earningsLines: any[] = payslip.earningsLines ?? [];
    const deductionLines: any[] = payslip.deductionLines ?? [];

    const baseSalary =
      earningsLines.find((e: any) => e.calculationType === 'STANDARDPAY')?.amount ?? 0;
    const overtimePay =
      earningsLines.find((e: any) => e.calculationType === 'OVERTIMEPAY')?.amount ?? 0;
    const hoursWorkedRaw = earningsLines.find((e: any) => e.ratePerUnit)?.numberOfUnits;
    const hoursWorked = Array.isArray(hoursWorkedRaw)
      ? hoursWorkedRaw[0] ?? 0
      : hoursWorkedRaw ?? 0;
    const totalDeductions = deductionLines.reduce(
      (sum: number, d: any) => sum + (d.amount ?? 0),
      0
    );

    return NextResponse.json({
      baseSalary,
      hoursWorked,
      overtimePay,
      totalPay: payslip.wages ?? 0,
      deductions: totalDeductions,
      netPay: payslip.netPay ?? 0,
      payPeriodStart: payslip.payPeriodStartDate ?? null,
      payPeriodEnd: payslip.payPeriodEndDate ?? null,
    });

  } catch (error: any) {
    console.error('Error fetching Xero payroll:', error.response?.body || error.message);
    return NextResponse.json({ error: 'Failed to fetch payroll data from Xero.' }, { status: 500 });
  }
}
