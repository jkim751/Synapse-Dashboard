import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getXeroClient } from '@/lib/xero';

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get an authenticated Xero client
    const xero = await getXeroClient(userId);
    const activeTenantId = xero.tenants[0].tenantId;

    // Fetch Profit & Loss and Balance Sheet reports from Xero
    const profitAndLoss = await xero.accountingApi.getReportProfitAndLoss(activeTenantId);
    const balanceSheet = await xero.accountingApi.getReportBalanceSheet(activeTenantId);

    // Here you would process the reports to extract the numbers you need.
    // This is a simplified example; you'll need to inspect the report structure.
    const processedData = {
      // You will need to parse `profitAndLoss.body` and `balanceSheet.body`
      // to find the actual values for income, expenses, etc.
      totalIncome: 12345.67, // Replace with real parsed data
      totalExpenses: 8765.43, // Replace with real parsed data
      netProfit: 12345.67 - 8765.43, // Replace with real parsed data
    };

    return NextResponse.json(processedData);

  } catch (error: any) {
    console.error('Error fetching Xero reports:', error);
    return NextResponse.json({ error: 'Failed to fetch Xero reports', details: error.message }, { status: 500 });
  }
}