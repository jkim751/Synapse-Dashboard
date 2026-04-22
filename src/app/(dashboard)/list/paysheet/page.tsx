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

  const entries = await prisma.paySheetEntry.findMany({
    orderBy: { name: "asc" },
  });

  const extractNum = (name: string) => {
    const m = name.match(/\d+/);
    return m ? parseInt(m[0], 10) : -1;
  };

  const data = entries
    .map((e: { id: string; name: string; classType: string | null; privateRate: number | null; groupRate: number | null; hours: number | null }) => ({
      id: e.id,
      name: e.name,
      classType: e.classType as "private" | "group" | null,
      privateRate: e.privateRate,
      groupRate: e.groupRate,
      hours: e.hours,
    }))
    .sort((a: { name: string }, b: { name: string }) => {
      const na = extractNum(a.name);
      const nb = extractNum(b.name);
      if (na !== nb) return nb - na;
      return a.name.localeCompare(b.name);
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
