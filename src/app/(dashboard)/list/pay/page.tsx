import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { ITEM_PER_PAGE } from "@/lib/settings";
import TableSearch from "@/components/TableSearch";
import Pagination from "@/components/Pagination";
import PayTable, { PayEntry } from "@/components/PayTable";

const PayPage = async ({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; page?: string }>;
}) => {
  const { sessionClaims } = await auth();
  const role = (sessionClaims?.metadata as { role?: string })?.role;

  if (role !== "director") redirect("/");

  const { search, page: pageParam } = await searchParams;
  const query = search?.toLowerCase() ?? "";
  const page = parseInt(pageParam ?? "1", 10);

  const all = await prisma.payRate.findMany({
    orderBy: { name: "asc" },
  });

  const filtered = query
    ? all.filter((r: { name: string; }) => r.name.toLowerCase().includes(query))
    : all;

  const count = filtered.length;
  const paginated: PayEntry[] = filtered
    .slice((page - 1) * ITEM_PER_PAGE, page * ITEM_PER_PAGE)
    .map((r: { id: any; name: any; personType: string; payRate: any; description?: string | null }) => ({
      id: r.id,
      name: r.name,
      personType: r.personType as "TUTOR" | "ADMIN",
      payRate: r.payRate,
      description: r.description ?? null,
    }));

  return (
    <div className="bg-white p-4 rounded-xl flex-1 m-4 mt-0">
      <div className="flex items-center justify-between mb-4">
        <h1 className="hidden md:block text-lg font-semibold text-gray-800">
          Staff Pay Rates
        </h1>
        <TableSearch />
      </div>
      <PayTable data={paginated} />
      <Pagination page={page} count={count} />
    </div>
  );
};

export default PayPage;
