import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import XeroAuthButton from "@/components/XeroAuthButton";
import XeroFinancialReports from "@/components/XeroFinancialReports";
import XeroContactSync from "@/components/XeroContactSync";
import FinanceChart from "@/components/FinanceChart";
import XeroInvoiceManager from "@/components/XeroInvoiceManager";
import { getStoredTokens } from "@/lib/xero";

const AdminXeroPage = async () => {
  const { userId, sessionClaims } = await auth();
  const role = (sessionClaims?.metadata as { role?: string })?.role;

  if (!userId || (role !== "admin" && role !== "director")) {
    redirect("/");
  }

  const hasTokens = !!(await getStoredTokens(userId));

  // Fetch synced contacts (parents + students with a xeroContactId) for the invoice form
  const [parents, students] = await Promise.all([
    prisma.parent.findMany({
      where: { xeroContactId: { not: null } },
      select: { xeroContactId: true, name: true, surname: true },
    }),
    prisma.student.findMany({
      where: { xeroContactId: { not: null } },
      select: { xeroContactId: true, name: true, surname: true },
    }),
  ]);

  const contacts = [
    ...parents.map((p: { xeroContactId: string | null; name: string; surname: string }) => ({
      contactId: p.xeroContactId!,
      name: `${p.name} ${p.surname} (Parent)`,
    })),
    ...students.map((s: { xeroContactId: string | null; name: string; surname: string }) => ({
      contactId: s.xeroContactId!,
      name: `${s.name} ${s.surname} (Student)`,
    })),
  ];

  return (
    <div className="flex flex-col gap-8 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Xero Integration</h1>
        <XeroAuthButton initialIsAuthenticated={hasTokens} />
      </div>

      {hasTokens ? (
        <>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="rounded-xl bg-white p-6 shadow">
              <h2 className="mb-4 text-base font-semibold">Financial Reports</h2>
              <XeroFinancialReports />
            </div>
            <div className="rounded-xl bg-white p-6 shadow">
              <h2 className="mb-4 text-base font-semibold">Contact Sync</h2>
              <XeroContactSync />
            </div>
          </div>

          <div className="rounded-xl bg-white p-6 shadow">
            <FinanceChart />
          </div>

          <div className="rounded-xl bg-white p-6 shadow">
            <h2 className="mb-1 text-base font-semibold">Create Invoice</h2>
            <p className="mb-4 text-sm text-gray-500">
              Create and optionally email an invoice directly to a contact in Xero.
              {contacts.length === 0 && (
                <span className="ml-1 text-orange-600">
                  No synced contacts found — run Contact Sync first.
                </span>
              )}
            </p>
            <XeroInvoiceManager contacts={contacts} />
          </div>
        </>
      ) : (
        <div className="rounded-r-lg border-l-4 border-yellow-400 bg-yellow-50 p-4">
          <p className="font-bold text-yellow-800">Connection Required</p>
          <p className="text-yellow-700">
            Connect your Xero account above to view financial data, sync contacts, and create
            invoices.
          </p>
        </div>
      )}
    </div>
  );
};

export default AdminXeroPage;
