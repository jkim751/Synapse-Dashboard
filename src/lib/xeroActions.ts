import { auth } from "@clerk/nextjs/server";
import { getXeroClient } from "./xero";

export const getXeroReports = async () => {
    try {
      const { userId } = await auth();
      if (!userId) {
        throw new Error('User not authenticated');
      }
      const xero = await getXeroClient(userId);
      
      if (!xero.tenants || xero.tenants.length === 0) {
        throw new Error('No active Xero tenant found. Please ensure you have connected a Xero organization.');
      }
      
      const tenantId = xero.tenants[0].tenantId;
      
      // Get Profit & Loss report
      const profitLoss = await xero.accountingApi.getReportProfitAndLoss(tenantId);
      
      // Get Balance Sheet
      const balanceSheet = await xero.accountingApi.getReportBalanceSheet(tenantId);
      
      return {
        profitLoss: profitLoss.body,
        balanceSheet: balanceSheet.body
      };
    } catch (error) {
      console.error('Error fetching Xero reports:', error);
      throw error;
    }
  };