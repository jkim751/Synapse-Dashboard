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

    const { targetId, personType, entries } = await req.json();

    if (!Array.isArray(entries) || entries.length === 0) {
      return NextResponse.json({ error: 'Invalid input — provide entries array' }, { status: 400 });
    }
    for (const e of entries) {
      if (!e.date || typeof e.hours !== 'number' || e.hours <= 0 || e.hours > 24) {
        return NextResponse.json({ error: `Invalid entry — date "${e.date}" hours ${e.hours}` }, { status: 400 });
      }
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

    // Helper: compute pay period boundaries for a given date string
    const fixedLengths: Record<string, number> = {
      WEEKLY: 7, FORTNIGHTLY: 14, FOURWEEKLY: 28,
    };

    const getPeriodBounds = (dateStr: string): { periodStart: string; periodEnd: string } | { error: string } => {
      const selectedTs = new Date(dateStr).getTime();
      if (calType === 'MONTHLY') {
        const d = new Date(dateStr);
        const periodStart = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-01`;
        const lastDay = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
        const periodEnd = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${lastDay}`;
        return { periodStart, periodEnd };
      } else if (calType === 'TWICEMONTHLY') {
        const d = new Date(dateStr);
        const day = d.getUTCDate();
        const y = d.getUTCFullYear();
        const m = String(d.getUTCMonth() + 1).padStart(2, '0');
        if (day <= 15) {
          return { periodStart: `${y}-${m}-01`, periodEnd: `${y}-${m}-15` };
        } else {
          const lastDay = new Date(Date.UTC(y, d.getUTCMonth() + 1, 0)).getUTCDate();
          return { periodStart: `${y}-${m}-16`, periodEnd: `${y}-${m}-${lastDay}` };
        }
      } else {
        const len = fixedLengths[calType];
        if (!len || !anchorStart) return { error: `Unsupported calendar type or missing anchor date: ${calType}` };
        const anchorTs = new Date(anchorStart).getTime();
        const diffDays = Math.floor((selectedTs - anchorTs) / 86400000);
        const periodIndex = Math.floor(diffDays / len);
        const periodStart = addDays(anchorStart, periodIndex * len);
        const periodEnd = addDays(periodStart, len - 1);
        return { periodStart, periodEnd };
      }
    };

    // Group entries by pay period
    const periodGroups = new Map<string, { periodStart: string; periodEnd: string; items: { date: string; hours: number }[] }>();
    for (const entry of entries) {
      const bounds = getPeriodBounds(entry.date);
      if ('error' in bounds) return NextResponse.json({ error: bounds.error }, { status: 422 });
      const key = `${bounds.periodStart}|${bounds.periodEnd}`;
      if (!periodGroups.has(key)) {
        periodGroups.set(key, { periodStart: bounds.periodStart, periodEnd: bounds.periodEnd, items: [] });
      }
      periodGroups.get(key)!.items.push(entry);
    }

    // Create one timesheet per pay period, merging all entries within it.
    // If Xero says the timesheet already exists, fetch it and update in-place,
    // overwriting only the days supplied (leaving other days unchanged).
    for (const { periodStart, periodEnd, items } of periodGroups.values()) {
      const periodDays = Math.round((new Date(periodEnd).getTime() - new Date(periodStart).getTime()) / 86400000) + 1;

      // Build the new day-indexed hours from submitted entries
      const newUnits: Record<number, number> = {};
      for (const item of items) {
        const dayIndex = Math.round((new Date(item.date).getTime() - new Date(periodStart).getTime()) / 86400000);
        newUnits[dayIndex] = (newUnits[dayIndex] ?? 0) + item.hours;
      }

      const buildNumberOfUnits = (base: number[]): number[] => {
        const result = [...base];
        for (const [idx, hrs] of Object.entries(newUnits)) {
          result[Number(idx)] = hrs;
        }
        return result;
      };

      const timesheetPayload = {
        employeeID: employeeId!,
        startDate: periodStart,
        endDate: periodEnd,
        timesheetLines: [{ earningsRateID: earningsRateId, numberOfUnits: buildNumberOfUnits(Array(periodDays).fill(0)) }],
      } as any;

      try {
        await xero.payrollAUApi.createTimesheet(tenantId, [timesheetPayload]);
      } catch (createErr: any) {
        const errMsg: string = createErr?.response?.body?.Message ?? createErr?.message ?? '';
        if (!errMsg.toLowerCase().includes('already exists')) throw createErr;

        // Timesheet exists — find it and update
        const listRes = await xero.payrollAUApi.getTimesheets(tenantId, undefined, `EmployeeID=Guid("${employeeId}")&&StartDate>=DateTime(${periodStart})&&StartDate<=DateTime(${periodStart})`);
        const existing = listRes.body.timesheets?.find((t: any) => {
          const s = parseXeroDate(t.startDate);
          return s === periodStart;
        }) as any;

        if (!existing?.timesheetID) throw createErr;

        // Merge: start from existing day values, overwrite submitted days
        const existingLine = (existing.timesheetLines ?? []).find((l: any) => l.earningsRateID === earningsRateId) as any;
        const existingUnits: number[] = Array.isArray(existingLine?.numberOfUnits)
          ? existingLine.numberOfUnits
          : Array(periodDays).fill(0);
        // Pad if Xero returned fewer slots than period length
        while (existingUnits.length < periodDays) existingUnits.push(0);

        await xero.payrollAUApi.updateTimesheet(tenantId, existing.timesheetID, [{
          ...timesheetPayload,
          timesheetID: existing.timesheetID,
          timesheetLines: [{ earningsRateID: earningsRateId, numberOfUnits: buildNumberOfUnits(existingUnits) }],
        }] as any);
      }
    }

    return NextResponse.json({ success: true, count: entries.length });

  } catch (error: any) {
    const detail = error?.response?.body ?? error?.response?.data ?? error?.message ?? String(error);
    console.error('Log hours error:', typeof detail === 'object' ? JSON.stringify(detail) : detail);
    return NextResponse.json({ error: 'Failed to log hours to Xero' }, { status: 500 });
  }
}
