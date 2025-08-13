import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import XeroAuthButton from "@/components/XeroAuthButton";
import XeroFinancialReports from "@/components/XeroFinancialReports";
import XeroContactSync from "@/components/XeroContactSync";
import FinanceChart from "@/components/FinanceChart";
import { getStoredTokens } from "@/lib/xero"; // Import the check function

const AdminXeroPage = async () => {
  const { userId, sessionClaims } = await auth();
  const role = (sessionClaims?.metadata as { role?: string })?.role;
  
  if (role !== "admin") {
    redirect("/");
  }

  // SERVER-SIDE CHECK: Check if tokens exist before rendering the page
  const hasTokens = !!(await getStoredTokens(userId!));

  return (
    <div className="flex flex-col gap-8 p-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Xero Integration Dashboard</h1>
        <XeroAuthButton initialIsAuthenticated={hasTokens} />
      </div>
      
      {/* Conditionally render components based on authentication status */}
      {hasTokens ? (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-xl shadow">
              <h2 className="text-l font-semibold mb-4">Financial Reports</h2>
              <XeroFinancialReports />
            </div>
            <div className="bg-white p-6 rounded-xl shadow">
              <h2 className="text-l font-semibold mb-4">Contact Management</h2>
              <XeroContactSync />
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow">
            <FinanceChart />
          </div>
        </>
      ) : (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-r-lg">
          <p className="font-bold text-yellow-800">Connection Required</p>
          <p className="text-yellow-700">Please connect your Xero account to view financial data and sync contacts.</p>
        </div>
      )}
      
      {/* Invoice management can stay as it might be partially functional */}
      <div className="bg-white p-6 rounded-xl shadow">
        {/* ... your invoice management buttons ... */}
      </div>
    </div>
  );
};

export default AdminXeroPage;