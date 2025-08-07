
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import InvoicesList from "@/components/InvoicesList";

const ParentInvoicesPage = async () => {
  const { userId, sessionClaims } = await auth();
  const role = (sessionClaims?.metadata as { role?: string })?.role;
  
  if (role !== "parent") {
    redirect("/");
  }

  // Get parent's students
  const parent = await prisma.parent.findUnique({
    where: { id: userId! },
    include: {
      students: {
        select: {
          id: true,
          name: true,
          surname: true,
          xeroContactId: true,
        }
      }
    }
  });

  if (!parent) {
    redirect("/");
  }

  return (
    <div className="flex flex-col gap-6 p-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">School Invoices</h1>
      </div>
      
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-l font-semibold mb-4">Outstanding Invoices</h2>
        <InvoicesList students={parent.students} />
      </div>
      
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-l font-semibold mb-4">Payment History</h2>
        <div className="text-gray-500">Your payment history will appear here.</div>
      </div>
    </div>
  );
};

export default ParentInvoicesPage;
