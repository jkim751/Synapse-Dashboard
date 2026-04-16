import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import PayrollSummary from "@/components/PayrollSummary";

const PayrollPage = async () => {
  const { userId, sessionClaims } = await auth();
  const role = (sessionClaims?.metadata as { role?: string })?.role;

  if (!userId || (role !== "teacher" && role !== "admin" && role !== "director")) {
    redirect("/");
  }

  // Admin/director don't have a teacher record — show a general payroll overview
  if (role === "admin" || role === "director") {
    const teachers = await prisma.teacher.findMany({
      select: {
        id: true,
        name: true,
        surname: true,
        xeroEmployeeId: true,
        subjects: { select: { name: true } },
        classes: { select: { id: true } },
        lessons: { select: { id: true } },
      },
    });

    return (
      <div className="flex flex-col gap-6 p-4">
        <h1 className="text-2xl font-bold">Payroll Overview</h1>

        {teachers.length === 0 ? (
          <p className="text-gray-500">No teachers found.</p>
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {teachers.map((t: { id: string; name: string; surname: string; xeroEmployeeId: string | null; subjects: { name: string }[]; classes: { id: number }[]; lessons: { id: number }[] }) => (
              <div key={t.id} className="rounded-xl bg-white p-6 shadow">
                <h2 className="mb-4 text-base font-semibold">
                  {t.name} {t.surname}
                </h2>
                <PayrollSummary teacher={t} />
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Teacher view — their own payslip
  const teacher = await prisma.teacher.findUnique({
    where: { id: userId },
    include: {
      lessons: { include: { class: true, subject: true } },
      subjects: true,
      classes: true,
    },
  });

  if (!teacher) redirect("/");

  return (
    <div className="flex flex-col gap-6 p-4">
      <h1 className="text-2xl font-bold">My Payroll</h1>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl bg-white p-6 shadow">
          <h2 className="mb-4 text-base font-semibold">Latest Payslip</h2>
          <PayrollSummary teacher={teacher} />
        </div>

        <div className="rounded-xl bg-white p-6 shadow">
          <h2 className="mb-4 text-base font-semibold">Teaching Load</h2>
          <div className="space-y-2 text-sm">
            <p>
              <span className="font-medium">Classes:</span> {teacher.classes.length}
            </p>
            <p>
              <span className="font-medium">Lessons:</span> {teacher.lessons.length}
            </p>
            <p>
              <span className="font-medium">Subjects:</span>{" "}
              {teacher.subjects.map((s: { name: string }) => s.name).join(", ") || "—"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PayrollPage;
