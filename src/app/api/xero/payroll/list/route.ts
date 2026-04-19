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

async function resolvePersonFromRole(userId: string, role: string) {
  if (role === 'teacher') {
    return prisma.teacher.findUnique({ where: { id: userId }, select: { name: true, surname: true, email: true, xeroEmployeeId: true } });
  }
  if (role === 'admin' || role === 'teacher-admin') {
    const a = await prisma.admin.findUnique({ where: { id: userId }, select: { name: true, surname: true, email: true } });
    return a ? { ...a, xeroEmployeeId: null } : null;
  }
  if (role === 'director') {
    const d = await prisma.director.findUnique({ where: { id: userId }, select: { name: true, surname: true, email: true } });
    return d ? { ...d, xeroEmployeeId: null } : null;
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

    const targetIdParam = req.nextUrl.searchParams.get('targetId');
    const personTypeParam = req.nextUrl.searchParams.get('personType');
    const isDirector = role === 'director';

    let person: { name: string; surname: string; email?: string | null; xeroEmployeeId?: string | null } | null = null;
    let targetTeacherId: string | null = null;

    if (isDirector && targetIdParam) {
      if (personTypeParam === 'admin') {
        const a = await prisma.admin.findUnique({ where: { id: targetIdParam }, select: { name: true, surname: true, email: true } });
        person = a ? { ...a, xeroEmployeeId: null } : null;
      } else {
        person = await prisma.teacher.findUnique({ where: { id: targetIdParam }, select: { name: true, surname: true, email: true, xeroEmployeeId: true } });
        targetTeacherId = targetIdParam;
      }
    } else {
      person = await resolvePersonFromRole(userId, role);
    }

    if (!person) return NextResponse.json({ error: 'Record not found for this user.' }, { status: 404 });

    const xero = await getAnyXeroClient();
    const tenantId = xero.tenants[0].tenantId;

    let employeeId = person.xeroEmployeeId ?? null;
    if (!employeeId) {
      const empRes = await xero.payrollAUApi.getEmployees(tenantId);
      const matched = matchEmployee(empRes.body.employees ?? [], person.email, person.name, person.surname);
      if (!matched?.employeeID) {
        return NextResponse.json({ error: 'Could not match to a Xero Payroll employee.' }, { status: 404 });
      }
      employeeId = matched.employeeID;
      if (role === 'teacher' || (isDirector && targetTeacherId)) {
        await prisma.teacher.update({ where: { id: targetTeacherId ?? userId }, data: { xeroEmployeeId: employeeId } });
      }
    }

    // Fetch all pay runs and collect this employee's payslip stubs
    const payRunsRes = await xero.payrollAUApi.getPayRuns(tenantId);
    const payRuns = payRunsRes.body.payRuns ?? [];
    const sorted = [...payRuns]
      .filter((r: any) => r.payRunStatus === 'POSTED')
      .sort((a: any, b: any) => new Date(b.paymentDate ?? 0).getTime() - new Date(a.paymentDate ?? 0).getTime())
      .slice(0, 12); // last 12 posted pay runs

    const payslips: { payslipId: string; payPeriodStart: string; payPeriodEnd: string; netPay: number; wages: number }[] = [];

    for (const run of sorted) {
      const runId = (run as any).payRunID;
      if (!runId) continue;
      const runDetail = await xero.payrollAUApi.getPayRun(tenantId, runId);
      const stubs: any[] = runDetail.body.payRuns?.[0]?.payslips ?? [];
      const stub = stubs.find((s: any) => s.employeeID === employeeId);
      if (stub?.payslipID) {
        payslips.push({
          payslipId: stub.payslipID,
          payPeriodStart: stub.payPeriodStartDate ?? (run as any).payPeriodStartDate ?? '',
          payPeriodEnd: stub.payPeriodEndDate ?? (run as any).payPeriodEndDate ?? '',
          netPay: stub.netPay ?? 0,
          wages: stub.wages ?? 0,
        });
      }
    }

    return NextResponse.json({ payslips });

  } catch (error: any) {
    console.error('Payroll list error:', error?.response?.body ?? error?.message);
    return NextResponse.json({ error: 'Failed to fetch payroll data from Xero.' }, { status: 500 });
  }
}
