
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import PayrollSummary from "@/components/PayrollSummary";

const TeacherPayrollPage = async () => {
  const { userId, sessionClaims } = await auth();
  const role = (sessionClaims?.metadata as { role?: string })?.role;
  
  if (role !== "teacher") {
    redirect("/");
  }

  // Get teacher's information
  const teacher = await prisma.teacher.findUnique({
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

  if (!teacher) {
    redirect("/");
  }

  return (
    <div className="flex flex-col gap-6 p-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Payroll Dashboard</h1>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Current Month Summary */}
        <div className="bg-white p-6 rounded-xl shadow">
          <h2 className="text-l font-semibold mb-4">Current Month</h2>
          <PayrollSummary teacher={teacher} />
        </div>
        
        {/* Teaching Load */}
        <div className="bg-white p-6 rounded-xl shadow">
          <h2 className="text-l font-semibold mb-4">Teaching Load</h2>
          <div className="space-y-2">
            <p><strong>Total Classes:</strong> {teacher.classes.length}</p>
            <p><strong>Total Lessons:</strong> {teacher.lessons.length}</p>
            <p><strong>Subjects:</strong> {teacher.subjects.map(s => s.name).join(", ")}</p>
          </div>
        </div>
      </div>
      
      {/* Payslips History */}
      <div className="bg-white p-6 rounded-xl shadow">
        <h2 className="text-l font-semibold mb-4">Payslip History</h2>
        <div className="text-gray-500">Your payslip history will appear here once Xero integration is configured.</div>
      </div>
    </div>
  );
};

export default TeacherPayrollPage;
