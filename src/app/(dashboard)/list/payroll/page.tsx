import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import PayrollView from "@/components/PayrollView";

const PayrollPage = async () => {
  const { userId, sessionClaims } = await auth();
  const role = (sessionClaims?.metadata as { role?: string })?.role;

  if (!userId || (role !== "teacher" && role !== "admin" && role !== "director" && role !== "teacher-admin")) {
    redirect("/");
  }

  // Directors see all teachers + admins in the selector. Everyone else sees only themselves.
  if (role === "director") {
    const [teachers, admins] = await Promise.all([
      prisma.teacher.findMany({
        select: { id: true, name: true, surname: true },
        orderBy: [{ name: "asc" }, { surname: "asc" }],
      }),
      prisma.admin.findMany({
        select: { id: true, name: true, surname: true },
        orderBy: [{ name: "asc" }, { surname: "asc" }],
      }),
    ]);

    const people = [
      ...teachers.map((t: { id: string; name: string; surname: string }) => ({ ...t, personType: "teacher" as const })),
      ...admins.map((a: { id: string; name: string; surname: string }) => ({ ...a, personType: "admin" as const })),
    ];

    return (
      <div className="flex flex-col gap-6 p-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Payroll</h1>
          <p className="text-sm text-gray-400 mt-1">View Xero payslips and log timesheet hours.</p>
        </div>
        <PayrollView role={role} people={people} defaultPersonId={people[0]?.id ?? ""} />
      </div>
    );
  }

  // Admin, teacher-admin, teacher — resolve self from the right table
  let selfName = "";
  let selfSurname = "";

  if (role === "teacher") {
    const t = await prisma.teacher.findUnique({ where: { id: userId }, select: { name: true, surname: true } });
    if (!t) redirect("/");
    selfName = t.name;
    selfSurname = t.surname;
  } else {
    // admin / teacher-admin
    const a = await prisma.admin.findUnique({ where: { id: userId }, select: { name: true, surname: true } });
    if (!a) redirect("/");
    selfName = a.name;
    selfSurname = a.surname;
  }

  return (
    <div className="flex flex-col gap-6 p-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">My Payroll</h1>
        <p className="text-sm text-gray-400 mt-1">View your Xero payslip and log timesheet hours.</p>
      </div>
      <PayrollView
        role={role}
        people={[{ id: userId, name: selfName, surname: selfSurname, personType: role === "teacher" ? "teacher" : "admin" }]}
        defaultPersonId={userId}
      />
    </div>
  );
};

export default PayrollPage;
