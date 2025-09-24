import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getXeroReports } from '@/lib/xeroActions';

export async function GET() {
  try {
    const { userId, sessionClaims } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const role = (sessionClaims?.metadata as { role?: string })?.role;
    if (role !== "admin") {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const reports = await getXeroReports();
    
    // Extract financial summary from reports
    const profitLossRows = reports.profitLoss.reports?.[0]?.rows || [];
    let totalIncome = 0;
    let totalExpenses = 0;

    // Parse Profit & Loss report structure
    for (const row of profitLossRows) {
      if (row.rowType?.toString() === 'Section') {
        const title = row.title?.toLowerCase() || '';
        const cells = row.cells || [];
        const amount = parseFloat(cells[1]?.value || '0');
        
        if (title.includes('income') || title.includes('revenue')) {
          totalIncome += amount;
        } else if (title.includes('expense') || title.includes('cost')) {
          totalExpenses += Math.abs(amount);
        }
      }
    }

    const netProfit = totalIncome - totalExpenses;

    const summary = {
      totalIncome,
      totalExpenses,
      netProfit
    };

    return NextResponse.json({ 
      summary,
      profitLoss: reports.profitLoss,
      balanceSheet: reports.balanceSheet
    });

  } catch (error: any) {
    console.error('Error fetching Xero reports:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch reports' },
      { status: 500 }
    );
  }
}