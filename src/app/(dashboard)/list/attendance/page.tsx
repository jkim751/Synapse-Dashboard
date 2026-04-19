import Pagination from "@/components/Pagination";
import Table from "@/components/Table";
import TableSearch from "@/components/TableSearch";
import prisma from "@/lib/prisma";
import { ITEM_PER_PAGE } from "@/lib/settings";
import { Class, Prisma } from "@prisma/client";
import Image from "next/image";
import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { redirect } from "next/navigation";

type AttendanceList = Class & { supervisorName?: string };

async function resolveSupervisorNames(ids: string[]): Promise<Map<string, string>> {
  if (ids.length === 0) return new Map();
  const [teachers, admins] = await Promise.all([
    prisma.teacher.findMany({ where: { id: { in: ids } }, select: { id: true, name: true, surname: true } }),
    prisma.admin.findMany({ where: { id: { in: ids } }, select: { id: true, name: true, surname: true } }),
  ]);
  const map = new Map<string, string>();
  for (const t of teachers) map.set(t.id, `${t.name} ${t.surname}`);
  for (const a of admins) map.set(a.id, `${a.name} ${a.surname}`);
  return map;
}

const AttendanceListPage = async ({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) => {

const { userId, sessionClaims } = await auth();
const role = (sessionClaims?.metadata as { role?: string })?.role;
const resolvedSearchParams = await searchParams;

if (!role || !["admin", "director", "teacher", "teacher-admin"].includes(role)) {
  redirect("/");
}

const columns = [
  {
    header: "Class Name",
    accessor: "name",
  },
  {
    header: "Teacher",
    accessor: "supervisor",
    className: "hidden md:table-cell",
  },
]
const renderRow = (item: AttendanceList) => (
  <tr
    key={item.id}
    className="border-b border-gray-200 even:bg-slate-50 text-sm hover:bg-lamaPurpleLight"
  >
    <td className="flex items-center gap-4 p-4">{item.name}</td>
    <td className="hidden md:table-cell">
      {item.supervisorName ?? "—"}
    </td>
    <td>
      <div className="flex items-center gap-2">
        <Link href={`/list/attendance/${item.id}`}>
          <button className="w-7 h-7 flex items-center justify-center rounded-full bg-orange-200">
            <Image src="/view.png" alt="" width={16} height={16} />
          </button>
        </Link>
      </div>
    </td>

  </tr>
);

const { page, ...queryParams } = resolvedSearchParams;

const p = page ? parseInt(page) : 1;

const query: Prisma.ClassWhereInput = {};

if ((role === "teacher" || role === "teacher-admin") && userId) {
  query.OR = [
    { supervisorId: userId },
    { lessons: { some: { teacherId: userId } } },
    { RecurringLesson: { some: { teacherId: userId } } },
  ];
}

if (queryParams.search) {
  const searchValue = queryParams.search;
  const [matchingTeachers, matchingAdmins] = await Promise.all([
    prisma.teacher.findMany({
      where: { OR: [{ name: { contains: searchValue, mode: "insensitive" } }, { surname: { contains: searchValue, mode: "insensitive" } }] },
      select: { id: true },
    }),
    prisma.admin.findMany({
      where: { OR: [{ name: { contains: searchValue, mode: "insensitive" } }, { surname: { contains: searchValue, mode: "insensitive" } }] },
      select: { id: true },
    }),
  ]);
  const supervisorIds = [...matchingTeachers, ...matchingAdmins].map(r => r.id);
  query.OR = [
    { name: { contains: searchValue, mode: "insensitive" } },
    ...(supervisorIds.length > 0 ? [{ supervisorId: { in: supervisorIds } }] : []),
  ];
}

  if (queryParams) {
    for (const [key, value] of Object.entries(queryParams)) {
      if (value !== undefined) {
        switch (key) {
          case "teacherId":
            query.lessons = {
              some: {
                teacherId: value ?? undefined,
              },
            };
            break;
          default:
            break;
        }
      }
    }
  }

  const [rawData, count] = await prisma.$transaction([
    prisma.class.findMany({
      where: query,
      orderBy: {
        name: "asc",
      },
      take: ITEM_PER_PAGE,
      skip: ITEM_PER_PAGE * (p - 1),
    }),
    prisma.class.count({ where: query }),
  ]);

  const supervisorIds = [...new Set(rawData.map((c: { supervisorId: string | null }) => c.supervisorId).filter(Boolean))] as string[];
  const supervisorNameMap = await resolveSupervisorNames(supervisorIds);
  const data: AttendanceList[] = rawData.map((c: any) => ({
    ...c,
    supervisorName: c.supervisorId ? supervisorNameMap.get(c.supervisorId) : undefined,
  }));

  return (
    <div className="bg-white p-4 rounded-xl flex-1 m-4 mt-0">
      {/* TOP */}
      <div className="flex items-center justify-between">
        <h1 className="hidden md:block text-lg font-semibold">Attendance</h1>
        <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
          <TableSearch />
        </div>
      </div>
      {/* LIST */}
      <Table columns={columns} renderRow={renderRow} data={data} />
      {/* PAGINATION */}
      <Pagination page={p} count={count} />
    </div>
  );
};

export default AttendanceListPage;
