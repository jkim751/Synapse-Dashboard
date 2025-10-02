import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import PayrollSummary from "@/components/PayrollSummary";

const PayrollPage = async () => {
  const { userId, sessionClaims } = await auth();
  const role = (sessionClaims?.metadata as { role?: string })?.role;
  
  if (role !== "teacher" && role !== "admin") {
    redirect("/");
  }

  // Get user's information (works for both admin and teacher)
  const user = await prisma.teacher.findUnique({
    where: { id: userId! },
    include: {
      lessons: {
        include: {
          class: true,
          subject: true,
        }
      },
      subjects: true,
      classes: true,
    }
  }); 

  if (!user) {
    redirect("/");
  }

  const pageTitle = role === "admin" ? "Admin Payroll Dashboard" : "Teacher Payroll Dashboard";

  return (
    <div className="flex flex-col gap-6 p-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">{pageTitle}</h1>
      </div>
      
      <div className={`grid grid-cols-1 ${role === "teacher" ? "lg:grid-cols-2" : ""} gap-6`}>
        {/* Current Month Summary */}
        <div className="bg-white p-6 rounded-xl shadow">
          <h2 className="text-l font-semibold mb-4">Current Month</h2>
          <PayrollSummary teacher={user} />
        </div>
        
        {/* Teaching Load - Only show for teachers */}
        {role === "teacher" && (
          <div className="bg-white p-6 rounded-xl shadow">
            <h2 className="text-l font-semibold mb-4">Teaching Load</h2>
            <div className="space-y-2">
              <p><strong>Total Classes:</strong> {user.classes.length}</p>
              <p><strong>Total Lessons:</strong> {user.lessons.length}</p>
              <p><strong>Subjects:</strong> {user.subjects.map((s: { name: any; }) => s.name).join(", ")}</p>
            </div>
          </div>
        )}
      </div>
      
      {/* Payslips History */}
      <div className="bg-white p-6 rounded-xl shadow">
        <h2 className="text-l font-semibold mb-4">Payslip History</h2>
        <div className="text-gray-500">Your payslip history will appear here once Xero integration is configured.</div>
      </div>
    </div>
  );
};

export default PayrollPage;
