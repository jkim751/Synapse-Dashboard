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
    } catch { /* ignore, will fall back below */ }

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

    // Parse Xero date (Date object, /Date(ms+offset)/ string, or YYYY-MM-DD) → "YYYY-MM-DD"
    const parseXeroDate = (d: any): string | null => {
      if (!d) return null;
      if (d instanceof Date) return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
      const s = String(d);
      const match = s.match(/\/Date\((-?\d+)[\+\-]?\d*\)\//);
      if (match) return new Date(parseInt(match[1], 10)).toISOString().slice(0, 10);
      if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
      return null;
    };

    // Normalise calendarType — xero-node may return a numeric enum (0=WEEKLY etc.) or a string
    const CALENDAR_TYPE_MAP: Record<number, string> = {
      0: 'WEEKLY', 1: 'FORTNIGHTLY', 2: 'FOURWEEKLY',
      3: 'MONTHLY', 4: 'TWICEMONTHLY', 5: 'QUARTERLY',
    };
    const normaliseCalType = (v: any): string => {
      if (typeof v === 'number') return CALENDAR_TYPE_MAP[v] ?? '';
      return String(v ?? '');
    };

    const addDays = (dateStr: string, n: number) => {
      const d = new Date(dateStr);
      d.setUTCDate(d.getUTCDate() + n);
      return d.toISOString().slice(0, 10);
    };

    // Get employee's payroll calendar to compute period boundaries
    const empRes = await xero.payrollAUApi.getEmployee(tenantId, employeeId!);
    const emp = empRes.body.employees?.[0] as any;
    const calendarId = emp?.payrollCalendarID;

    let calType: string = '';
    let anchorStart: string | null = null;

    if (calendarId) {
      try {
        const calRes = await xero.payrollAUApi.getPayrollCalendar(tenantId, calendarId);
        const cal = calRes.body.payrollCalendars?.[0] as any;
        calType = normaliseCalType(cal?.calendarType);
        anchorStart = parseXeroDate(cal?.startDate) ?? null;
        console.log('Payroll calendar:', { calType, anchorStart, raw: cal?.calendarType });
      } catch (calErr: any) {
        console.error('Payroll calendar fetch failed:', calErr?.response?.body ?? calErr?.message);
      }
    }

    // Fallback: infer calendar type and anchor from a recent pay run's period dates
    if (!calType || !anchorStart) {
      const payRunsRes = await xero.payrollAUApi.getPayRuns(tenantId);
      const runs: any[] = payRunsRes.body.payRuns ?? [];
      const posted = runs
        .filter((r: any) => r.payRunStatus === 'POSTED' || r.payRunStatus === 'DRAFT')
        .sort((a: any, b: any) => new Date(b.paymentDate ?? 0).getTime() - new Date(a.paymentDate ?? 0).getTime());

      if (posted.length === 0) {
        return NextResponse.json({ error: 'No pay runs found in Xero. Please ensure a pay run exists or reconnect Xero.' }, { status: 422 });
      }

      // Fetch the most recent run detail to get period dates
      const runDetail = await xero.payrollAUApi.getPayRun(tenantId, (posted[0] as any).payRunID);
      const detailRun = runDetail.body.payRuns?.[0] as any;
      console.log('Pay run detail keys:', detailRun ? Object.keys(detailRun) : 'null');
      console.log('Pay run period dates:', {
        start: detailRun?.payRunPeriodStartDate,
        end: detailRun?.payRunPeriodEndDate,
      });
      const start = parseXeroDate(detailRun?.payRunPeriodStartDate);
      const end = parseXeroDate(detailRun?.payRunPeriodEndDate);

      if (!start || !end) {
        return NextResponse.json({ error: 'Could not determine pay period from Xero pay runs.' }, { status: 422 });
      }

      const len = Math.round((new Date(end).getTime() - new Date(start).getTime()) / 86400000) + 1;
      anchorStart = start;
      if (len === 7) calType = 'WEEKLY';
      else if (len === 14) calType = 'FORTNIGHTLY';
      else if (len === 28) calType = 'FOURWEEKLY';
      else calType = 'WEEKLY';
    }

    // Period length in days for fixed-length calendars
    const fixedLengths: Record<string, number> = {
      WEEKLY: 7, FORTNIGHTLY: 14, FOURWEEKLY: 28,
    };

    const selectedTs = new Date(date).getTime();
    let periodStart: string;
    let periodEnd: string;

    if (calType === 'MONTHLY') {
      const d = new Date(date);
      periodStart = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-01`;
      const lastDay = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
      periodEnd = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${lastDay}`;
    } else if (calType === 'TWICEMONTHLY') {
      const d = new Date(date);
      const day = d.getUTCDate();
      const y = d.getUTCFullYear();
      const m = String(d.getUTCMonth() + 1).padStart(2, '0');
      if (day <= 15) {
        periodStart = `${y}-${m}-01`;
        periodEnd = `${y}-${m}-15`;
      } else {
        periodStart = `${y}-${m}-16`;
        const lastDay = new Date(Date.UTC(y, d.getUTCMonth() + 1, 0)).getUTCDate();
        periodEnd = `${y}-${m}-${lastDay}`;
      }
    } else {
      const len = fixedLengths[calType];
      if (!len || !anchorStart) {
        return NextResponse.json({ error: `Unsupported calendar type or missing anchor date: ${calType}` }, { status: 422 });
      }
      // Step from anchor to find the period containing the selected date
      const anchorTs = new Date(anchorStart).getTime();
      const diffDays = Math.floor((selectedTs - anchorTs) / 86400000);
      const periodIndex = Math.floor(diffDays / len);
      periodStart = addDays(anchorStart, periodIndex * len);
      periodEnd = addDays(periodStart, len - 1);
    }

    // Build numberOfUnits array: one slot per day in the period, hours on the selected day
    const periodDays = Math.round((new Date(periodEnd).getTime() - new Date(periodStart).getTime()) / 86400000) + 1;
    const dayIndex = Math.round((selectedTs - new Date(periodStart).getTime()) / 86400000);
    const numberOfUnits = Array(periodDays).fill(0);
    numberOfUnits[dayIndex] = hours;

    // createTimesheet takes Array<Timesheet> directly; startDate/endDate must be YYYY-MM-DD strings
    await xero.payrollAUApi.createTimesheet(tenantId, [
      {
        employeeID: employeeId!,
        startDate: periodStart,
        endDate: periodEnd,
        timesheetLines: [{ earningsRateID: earningsRateId, numberOfUnits }],
      } as any,
    ]);

    return NextResponse.json({ success: true, date, hours });

  } catch (error: any) {
    const detail = error?.response?.body ?? error?.response?.data ?? error?.message ?? String(error);
    console.error('Log hours error:', typeof detail === 'object' ? JSON.stringify(detail) : detail);
    return NextResponse.json({ error: 'Failed to log hours to Xero' }, { status: 500 });
  }
}
