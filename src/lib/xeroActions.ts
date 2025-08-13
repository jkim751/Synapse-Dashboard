import { auth } from "@clerk/nextjs/server";
import { getXeroClient } from "./xero";

export const getXeroReports = async () => {
    try {
      const { userId } = await auth();
      const xero = await getXeroClient(userId || undefined);
      
      // Get Profit & Loss report
      const profitLoss = await xero.accountingApi.getReportProfitAndLoss('');
      
      // Get Balance Sheet
      const balanceSheet = await xero.accountingApi.getReportBalanceSheet('');
      
      return {
        profitLoss: profitLoss.body,
        balanceSheet: balanceSheet.body
      };
    } catch (error) {
      console.error('Error fetching Xero reports:', error);
      throw error;
    }
  };