import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import WorkedHoursTable, { HoursEntry } from "@/components/WorkedHoursTable";
import WorkedHoursDirectorView from "@/components/WorkedHoursDirectorView";

const WorkedHoursPage = async () => {
  const { userId, sessionClaims } = await auth();
  const role = (sessionClaims?.metadata as { role?: string })?.role;

  const allowed = role === "teacher" || role === "teacher-admin" || role === "director";
  if (!userId || !allowed) redirect("/");

  // Director — person selector + read-only view of anyone's hours
  if (role === "director") {
    const [teachers, teacherAdmins] = await Promise.all([
      prisma.teacher.findMany({
        select: { id: true, name: true, surname: true },
        orderBy: [{ name: "asc" }, { surname: "asc" }],
      }),
      prisma.admin.findMany({
        where: { role: "teacher-admin" },
        select: { id: true, name: true, surname: true },
        orderBy: [{ name: "asc" }, { surname: "asc" }],
      }),
    ]);

    const people = [
      ...teachers.map((t: any) => ({ ...t, role: "teacher" as const })),
      ...teacherAdmins.map((a: any) => ({ ...a, role: "teacher-admin" as const })),
    ];

    return (
      <div className="bg-white p-4 rounded-xl flex-1 m-4 mt-0">
        <div className="mb-6">
          <h1 className="text-lg font-semibold text-gray-800">Worked Hours</h1>
          <p className="text-sm text-gray-400 mt-1">View hours logged by teachers and teacher-admins.</p>
        </div>
        <WorkedHoursDirectorView people={people} />
      </div>
    );
  }

  // Teacher / teacher-admin — see only their own entries
  const raw = await prisma.workedHours.findMany({
    where: { teacherId: userId },
    orderBy: { date: "desc" },
  });

  const entries: HoursEntry[] = raw.map((e: any) => ({
    id: e.id,
    date: e.date.toISOString(),
    className: e.className,
    hoursWorked: e.hoursWorked,
    attendees: e.attendees,
    notes: e.notes,
  }));

  return (
    <div className="bg-white p-4 rounded-xl flex-1 m-4 mt-0">
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-gray-800">My Worked Hours</h1>
        <p className="text-sm text-gray-400 mt-1">Log and track your hours for each class.</p>
      </div>
      <WorkedHoursTable key={userId} initialEntries={entries} teacherId={userId} />
    </div>
  );
};

export default WorkedHoursPage;
