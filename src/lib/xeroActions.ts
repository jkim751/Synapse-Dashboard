import { auth } from "@clerk/nextjs/server";
import { getXeroClient } from "./xero";

export const getXeroReports = async () => {
    try {
      const { userId } = await auth();
      if (!userId) {
        throw new Error('User not authenticated');
      }
      const xero = await getXeroClient(userId);
      
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