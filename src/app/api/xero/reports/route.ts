import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getXeroClient } from '@/lib/xero';
// The Report type is what's inside the 'reports' array of a ReportWithRows
import { Report, ReportWithRows, RowType } from 'xero-node'; 

// --- CORRECTED Helper Function ---
function findReportValue(reportWithRows: ReportWithRows | undefined, sectionTitle: string, rowTitle: string): number {
  // 1. Get the actual Report object, which is nested inside.
  const report = reportWithRows?.reports?.[0];

  if (!report || !report.rows) return 0;

  const section = report.rows.find(row => row.rowType === RowType.Section && row.title === sectionTitle);
  if (!section || !section.rows) return 0;

  const summaryRow = section.rows.find(row => row.rowType === RowType.SummaryRow || row.title === rowTitle);
  const value = summaryRow?.cells?.[1]?.value;
  
  return typeof value === 'string' ? parseFloat(value) || 0 : 0;
}

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const xero = await getXeroClient(userId);
    // The active tenant ID is the first one in the tenants array.
    const activeTenantId = xero.tenants[0]?.tenantId;
    if (!activeTenantId) {
      throw new Error("No active Xero tenant found.");
    }

    const profitAndLossResponse = await xero.accountingApi.getReportProfitAndLoss(activeTenantId);
    
    // --- Parse the response ---
    const profitAndLossReportWithRows = profitAndLossResponse.body; // The top-level object

    // Use our corrected helper function
    const totalIncome = findReportValue(profitAndLossReportWithRows, "Revenue", "Total Revenue");
    const totalExpenses = findReportValue(profitAndLossReportWithRows, "Operating Expenses", "Total Operating Expenses");
    const netProfit = findReportValue(profitAndLossReportWithRows, "Result", "Net Profit");

    // Fetch monthly data for the chart
    const monthlyPnlResponse = await xero.accountingApi.getReportProfitAndLoss(activeTenantId, undefined, undefined, 11);
    const monthlyReportWithRows = monthlyPnlResponse.body;
    
    // --- CORRECTED Chart Data Transformation ---
    // 2. Get the nested Report object here as well.
    const monthlyReport = monthlyReportWithRows?.reports?.[0];
    const chartData = [];
    const reportColumns = monthlyReport?.rows?.[0]?.cells?.slice(1) || []; 

    for (let i = 0; i < reportColumns.length; i++) {
        const monthName = reportColumns[i].value || `Period ${i + 1}`;
        
        const monthIncome = monthlyReport?.rows
            ?.find(r => r.title === 'Total Revenue')?.cells?.[i + 1]?.value || 0;
        const monthExpense = monthlyReport?.rows
            ?.find(r => r.title === 'Total Operating Expenses')?.cells?.[i + 1]?.value || 0;
            
        chartData.push({
            name: monthName,
            income: monthIncome,
            expense: monthExpense,
        });
    }

    // Return everything in one payload
    return NextResponse.json({
      summary: {
        totalIncome,
        totalExpenses,
        netProfit,
      },
      chartData: chartData.reverse(),
    });

  } catch (error: any) {
    console.error('Error fetching Xero reports:', error.response?.body || error.message);
    return NextResponse.json({ error: 'Failed to fetch Xero reports', details: error.message }, { status: 500 });
  }
}