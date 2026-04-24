import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import CashbookTable from "@/components/CashbookTable";

const CashbookPage = async () => {
  const { sessionClaims } = await auth();
  const role = (sessionClaims?.metadata as { role?: string })?.role;

  if (role !== "admin" && role !== "director" && role !== "teacher-admin") {
    redirect("/");
  }

  return (
    <div className="bg-white p-6 rounded-xl flex-1 m-4 mt-0">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-semibold text-gray-800">Cashbook</h1>
      </div>
      <CashbookTable />
    </div>
  );
};

export default CashbookPage;
