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
    where: { subjectRate: { isNot: null } },
    orderBy: { name: "desc" },
    select: {
      id: true,
      name: true,
      subjectRate: { select: { privateRate: true, groupRate: true } },
    },
  }) as { id: number; name: string; subjectRate: { privateRate: number | null; groupRate: number | null } | null }[];

  const extractNum = (name: string) => {
    const m = name.match(/\d+/);
    return m ? parseInt(m[0], 10) : -1;
  };

  const data = subjects
    .map((s) => ({
      id: s.id,
      name: s.name,
      privateRate: s.subjectRate?.privateRate ?? null,
      groupRate: s.subjectRate?.groupRate ?? null,
    }))
    .sort((a, b) => {
      const na = extractNum(a.name);
      const nb = extractNum(b.name);
      if (na !== nb) return nb - na; // descending by number
      return a.name.localeCompare(b.name); // alphabetical fallback
    });

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
