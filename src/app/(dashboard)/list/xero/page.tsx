
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import XeroAuthButton from "@/components/XeroAuthButton";
import XeroFinancialReports from "@/components/XeroFinancialReports";
import XeroContactSync from "@/components/XeroContactSync";
import FinanceChart from "@/components/FinanceChart";

const AdminXeroPage = async () => {
  const { sessionClaims } = await auth();
  const role = (sessionClaims?.metadata as { role?: string })?.role;
  
  if (role !== "admin") {
    redirect("/");
  }

  return (
    <div className="flex flex-col gap-8 p-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Xero Integration Dashboard</h1>
        <XeroAuthButton />
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Financial Reports */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-l font-semibold mb-4">Financial Reports</h2>
          <XeroFinancialReports />
        </div>
        
        {/* Contact Sync */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-l font-semibold mb-4">Contact Management</h2>
          <XeroContactSync />
        </div>
      </div>
      
      {/* Finance Chart */}
      <div className="bg-white p-6 rounded-lg shadow">
        <FinanceChart />
      </div>
      
      {/* Invoice Management */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-l font-semibold mb-4">School Fee Invoices</h2>
        <div className="space-y-4">
          <button className="bg-orange-400 text-white px-4 py-2 rounded hover:bg-blue-400">
            Generate Monthly Invoices
          </button>
          <button className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 ml-4">
            Sync Outstanding Invoices
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminXeroPage;
