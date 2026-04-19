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

export async function POST(req: NextRequest) {
  try {
    const { userId, sessionClaims } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const role = (sessionClaims?.metadata as { role?: string })?.role;
    if (role !== 'teacher' && role !== 'admin' && role !== 'director' && role !== 'teacher-admin') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const { targetId, personType, date, hours } = await req.json();

    if (!date || typeof hours !== 'number' || hours <= 0 || hours > 24) {
      return NextResponse.json({ error: 'Invalid input — provide date and hours (0–24)' }, { status: 400 });
    }

    // Only directors may log hours for another person
    const isDirector = role === 'director';
    const resolvedTargetId = isDirector && targetId ? targetId : null;
    const resolvedPersonType = isDirector && personType ? personType : null;

    let person: { name: string; surname: string; email?: string | null; xeroEmployeeId?: string | null } | null = null;
    let targetTeacherId: string | null = null;

    if (resolvedTargetId) {
      if (resolvedPersonType === 'admin') {
        const admin = await prisma.admin.findUnique({
          where: { id: resolvedTargetId },
          select: { name: true, surname: true, email: true },
        });
        person = admin ? { ...admin, xeroEmployeeId: null } : null;
      } else {
        person = await prisma.teacher.findUnique({
          where: { id: resolvedTargetId },
          select: { name: true, surname: true, email: true, xeroEmployeeId: true },
        });
        targetTeacherId = resolvedTargetId;
      }
    } else {
      person = await resolvePersonFromRole(userId, role);
    }

    if (!person) return NextResponse.json({ error: 'Record not found for this user.' }, { status: 404 });

    const xero = await getAnyXeroClient();
    const tenantId = xero.tenants[0].tenantId;

    // Resolve Xero employee ID
    let employeeId = person.xeroEmployeeId ?? null;
    if (!employeeId) {
      const empRes = await xero.payrollAUApi.getEmployees(tenantId);
      const matched = matchEmployee(empRes.body.employees ?? [], person.email, person.name, person.surname);
      if (!matched?.employeeID) {
        return NextResponse.json({ error: 'Could not match to a Xero employee' }, { status: 404 });
      }
      employeeId = matched.employeeID;
      // Cache on teacher record only
      if (role === 'teacher' || targetTeacherId) {
        await prisma.teacher.update({
          where: { id: targetTeacherId ?? userId },
          data: { xeroEmployeeId: employeeId },
        });
      }
    }

    // Resolve earnings rate from employee pay template, fall back to first org rate
    let earningsRateId: string | null = null;
    try {
      const empDetail = await xero.payrollAUApi.getEmployee(tenantId, employeeId!);
      const earningsLines = empDetail.body.employees?.[0]?.payTemplate?.earningsLines ?? [];
      earningsRateId = earningsLines[0]?.earningsRateID ?? null;
    } catch { /* ignore */ }

    if (!earningsRateId) {
      const ratesRes = await xero.payrollAUApi.getPayItems(tenantId);
      earningsRateId = (ratesRes.body as any).payItems?.earningsRates?.[0]?.earningsRateID ?? null;
    }

    if (!earningsRateId) {
      return NextResponse.json(
        { error: 'No earnings rate found — set up a pay template for this employee in Xero' },
        { status: 422 }
      );
    }

    // Create single-day draft timesheet
    const timesheetBody = {
      timesheets: [{
        employeeID: employeeId,
        startDate: new Date(date),
        endDate: new Date(date),
        status: 'DRAFT',
        timesheetLines: [{ earningsRateID: earningsRateId, numberOfUnits: [hours] }],
      }],
    };

    await (xero.payrollAUApi as any).createTimesheet(tenantId, timesheetBody);

    return NextResponse.json({ success: true, date, hours });

  } catch (error: any) {
    console.error('Log hours error:', error?.response?.body ?? error?.message);
    return NextResponse.json({ error: 'Failed to log hours to Xero' }, { status: 500 });
  }
}
