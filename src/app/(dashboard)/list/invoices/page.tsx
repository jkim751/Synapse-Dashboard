import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import InvoicesList from "@/components/InvoicesList";

const ParentInvoicesPage = async () => {
  const { userId, sessionClaims } = await auth();
  const role = (sessionClaims?.metadata as { role?: string })?.role;

  if (!userId || role !== "parent") {
    redirect("/");
  }

  return (
    <div className="flex flex-col gap-6 p-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">School Invoices</h1>
      </div>

      <div className="bg-white p-6 rounded-xl shadow">
        <h2 className="text-l font-semibold mb-4">Your Invoices</h2>
        <InvoicesList />
      </div>
    </div>
  );
};

export default ParentInvoicesPage;
