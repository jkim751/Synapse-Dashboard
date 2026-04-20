import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import PaySheetTable from "@/components/PaySheetTable";

const PaySheetPage = async () => {
  const { sessionClaims } = await auth();
  const role = (sessionClaims?.metadata as { role?: string })?.role;

  if (role !== "admin" && role !== "director" && role !== "teacher-admin") {
    redirect("/");
  }

  const subjects = await prisma.subject.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      subjectRate: { select: { hourlyRate: true } },
    },
  });

  const data = subjects.map((s) => ({
    id: s.id,
    name: s.name,
    hourlyRate: s.subjectRate?.hourlyRate ?? null,
  }));

  return (
    <div className="bg-white p-4 rounded-xl flex-1 m-4 mt-0">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-semibold">Pay Sheet</h1>
      </div>
      <PaySheetTable subjects={data} />
    </div>
  );
};

export default PaySheetPage;
