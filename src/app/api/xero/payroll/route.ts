import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { getXeroClient } from '@/lib/xero';

export async function GET() {
  try {
    const { userId, sessionClaims } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const role = (sessionClaims?.metadata as { role?: string })?.role;
    
    // Allow both admin and teacher to access their own payroll
    if (role !== "teacher" && role !== "admin") {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const teacher = await prisma.teacher.findUnique({
      where: { id: userId },
      select: { xeroEmployeeId: true },
    });

    if (!teacher || !teacher.xeroEmployeeId) {
      throw new Error('User is not linked to an employee in Xero Payroll.');
    }

    const xero = await getXeroClient(userId);
    const activeTenantId = xero.tenants[0].tenantId;

    const payslipsResponse = await xero.payrollAUApi.getPayslip(
      activeTenantId,
      `EmployeeID=="${teacher.xeroEmployeeId}"`
    );

    const latestPayslip = payslipsResponse.body.payslip;

    if (!latestPayslip) {
      return NextResponse.json({ error: 'No payslips found for this user in Xero.' }, { status: 404 });
    }

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