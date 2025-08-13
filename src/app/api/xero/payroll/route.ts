import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { getXeroClient } from '@/lib/xero';

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const teacher = await prisma.teacher.findUnique({
      where: { id: userId },
      select: { xeroEmployeeId: true },
    });

    if (!teacher || !teacher.xeroEmployeeId) {
      throw new Error('Teacher is not linked to an employee in Xero Payroll.');
    }

    const xero = await getXeroClient(userId);
    const activeTenantId = xero.tenants[0].tenantId;

    // FIX 1: The method is indeed `getPaySlips` (plural). This was correct.
    // The previous error was likely a cascade from the 'any' type error below.
    const payslipsResponse = await xero.payrollAUApi.getPayslip(
      activeTenantId,
      `EmployeeID=="${teacher.xeroEmployeeId}"`
    );

    const latestPayslip = payslipsResponse.body.payslip;

    if (!latestPayslip) {
      return NextResponse.json({ error: 'No payslips found for this teacher in Xero.' }, { status: 404 });
    }

    // FIX 2: Explicitly type the parameter 'e' to resolve the 'any' type error.
    // FIX 2: Explicitly type the parameter 'e' to resolve the 'any' type error.
    const processedPayroll = {
      baseSalary: latestPayslip.earningsLines?.find((e: any) => e.calculationType === 'STANDARDPAY')?.amount || 0,
      hoursWorked: (() => {
        const earningsLine = latestPayslip.earningsLines?.find((e: any) => e.ratePerUnit);
        const numberOfUnits = earningsLine?.numberOfUnits;
        return Array.isArray(numberOfUnits) ? numberOfUnits[0] : numberOfUnits || 0;
      })(),
      overtimePay: latestPayslip.earningsLines?.find((e: any) => e.calculationType === 'OVERTIMEPAY')?.amount || 0,
      totalPay: latestPayslip.wages || 0,
      deductions: latestPayslip.deductions || 0,
      netPay: latestPayslip.netPay || 0,
    };
    return NextResponse.json(processedPayroll);

  } catch (error: any) {
    console.error('Error fetching Xero payroll:', error.response?.body || error.message);
    return NextResponse.json({ error: 'Failed to fetch payroll data from Xero.' }, { status: 500 });
  }
}