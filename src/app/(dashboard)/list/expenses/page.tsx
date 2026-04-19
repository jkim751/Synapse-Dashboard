import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import ExpensesShell from "@/components/ExpensesShell";

const ExpensesPage = async () => {
  const { sessionClaims } = await auth();
  const role = (sessionClaims?.metadata as { role?: string })?.role;

  if (role !== "admin" && role !== "director" && role !== "teacher-admin") {
    redirect("/");
  }

  return (
    <div className="flex flex-col gap-6 p-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Expenses</h1>
      </div>
      <ExpensesShell role={role!} />
    </div>
  );
};

export default ExpensesPage;
