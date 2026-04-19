import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { getAnyXeroClient } from '@/lib/xero';

function matchEmployee(employees: any[], email: string | null | undefined, name: string, surname: string): any | null {
  const fullName = `${name} ${surname}`.toLowerCase().trim();
  if (email) {
    const byEmail = employees.find((e: any) => e.email?.toLowerCase().trim() === email.toLowerCase().trim());
    if (byEmail) return byEmail;
  }
  return employees.find((e: any) => {
    const xeroName = `${e.firstName ?? ''} ${e.lastName ?? ''}`.toLowerCase().trim();
    return xeroName === fullName;
  }) ?? null;
}

// Resolve person info from the appropriate DB table based on role.
// Returns { name, surname, email, xeroEmployeeId } or null.
async function resolvePersonFromRole(userId: string, role: string) {
  if (role === 'teacher') {
    return prisma.teacher.findUnique({
      where: { id: userId },
      select: { name: true, surname: true, email: true, xeroEmployeeId: true },
    });
  }
  if (role === 'admin' || role === 'teacher-admin') {
    const admin = await prisma.admin.findUnique({
      where: { id: userId },
      select: { name: true, surname: true, email: true },
    });
    return admin ? { ...admin, xeroEmployeeId: null } : null;
  }
  if (role === 'director') {
    const director = await prisma.director.findUnique({
      where: { id: userId },
      select: { name: true, surname: true, email: true },
    });
    return director ? { ...director, xeroEmployeeId: null } : null;
  }
  return null;
}

export async function GET(req: NextRequest) {
  try {
    const { userId, sessionClaims } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const role = (sessionClaims?.metadata as { role?: string })?.role;
    if (role !== 'teacher' && role !== 'admin' && role !== 'director' && role !== 'teacher-admin') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Only directors may view another person's payslip via ?targetId= + ?personType=
    const targetIdParam = req.nextUrl.searchParams.get('targetId');
    const personTypeParam = req.nextUrl.searchParams.get('personType'); // 'teacher' | 'admin'
    const isDirector = role === 'director';

    let person: { name: string; surname: string; email?: string | null; xeroEmployeeId?: string | null } | null = null;
    let targetTeacherId: string | null = null;

    if (isDirector && targetIdParam) {
      if (personTypeParam === 'admin') {
        const admin = await prisma.admin.findUnique({
          where: { id: targetIdParam },
          select: { name: true, surname: true, email: true },
        });
        person = admin ? { ...admin, xeroEmployeeId: null } : null;
      } else {
        // Default: teacher
        person = await prisma.teacher.findUnique({
          where: { id: targetIdParam },
          select: { name: true, surname: true, email: true, xeroEmployeeId: true },
        });
        targetTeacherId = targetIdParam;
      }
    } else {
      // Everyone else (or director viewing self): resolve from own role table
      person = await resolvePersonFromRole(userId, role);
    }

    if (!person) return NextResponse.json({ error: 'Record not found for this user.' }, { status: 404 });

    const xero = await getAnyXeroClient();
    const activeTenantId = xero.tenants[0].tenantId;

    // Resolve Xero employee ID
    let employeeId = person.xeroEmployeeId ?? null;
    if (!employeeId) {
      const empRes = await xero.payrollAUApi.getEmployees(activeTenantId);
      const matched = matchEmployee(empRes.body.employees ?? [], person.email, person.name, person.surname);
      if (!matched?.employeeID) {
        return NextResponse.json(
          { error: 'Could not match to a Xero Payroll employee. Check that the name or email matches.' },
          { status: 404 }
        );
      }
      employeeId = matched.employeeID;
      // Cache on teacher record only (other roles have no xeroEmployeeId field)
      if (role === 'teacher' || (isDirector && targetTeacherId)) {
        await prisma.teacher.update({
          where: { id: targetTeacherId ?? userId },
          data: { xeroEmployeeId: employeeId },
        });
      }
    }

    // Walk recent pay runs to find this employee's payslip
    const payRunsRes = await xero.payrollAUApi.getPayRuns(activeTenantId);
    const payRuns = payRunsRes.body.payRuns ?? [];
    const sortedRuns = [...payRuns]
      .filter((r: any) => r.payRunStatus === 'POSTED' || r.payRunStatus === 'DRAFT')
      .sort((a: any, b: any) => new Date(b.paymentDate ?? 0).getTime() - new Date(a.paymentDate ?? 0).getTime());

    if (sortedRuns.length === 0) return NextResponse.json({ error: 'No pay runs found in Xero.' }, { status: 404 });

    let payslip: any = null;
    for (const run of sortedRuns.slice(0, 5)) {
      const runId = (run as any).payRunID;
      if (!runId) continue;
      const runDetail = await xero.payrollAUApi.getPayRun(activeTenantId, runId);
      const stubs: any[] = runDetail.body.payRuns?.[0]?.payslips ?? [];
      const stub = stubs.find((s: any) => s.employeeID === employeeId);
      if (stub?.payslipID) {
        const slipRes = await xero.payrollAUApi.getPayslip(activeTenantId, stub.payslipID);
        payslip = slipRes.body.payslip ?? null;
        if (payslip) break;
      }
    }

    if (!payslip) return NextResponse.json({ error: 'No payslip found in recent pay runs.' }, { status: 404 });

    const earningsLines: any[] = payslip.earningsLines ?? [];
    const deductionLines: any[] = payslip.deductionLines ?? [];
    const baseSalary = earningsLines.find((e: any) => e.calculationType === 'STANDARDPAY')?.amount ?? 0;
    const overtimePay = earningsLines.find((e: any) => e.calculationType === 'OVERTIMEPAY')?.amount ?? 0;
    const hoursWorkedRaw = earningsLines.find((e: any) => e.ratePerUnit)?.numberOfUnits;
    const hoursWorked = Array.isArray(hoursWorkedRaw) ? hoursWorkedRaw[0] ?? 0 : hoursWorkedRaw ?? 0;
    const totalDeductions = deductionLines.reduce((sum: number, d: any) => sum + (d.amount ?? 0), 0);

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
    console.error('Payroll error:', error?.response?.body ?? error?.message);
    return NextResponse.json({ error: 'Failed to fetch payroll data from Xero.' }, { status: 500 });
  }
}
