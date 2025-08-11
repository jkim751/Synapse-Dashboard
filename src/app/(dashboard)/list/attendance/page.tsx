import Pagination from "@/components/Pagination";
import Table from "@/components/Table";
import TableSearch from "@/components/TableSearch";
import prisma from "@/lib/prisma";
import { ITEM_PER_PAGE } from "@/lib/settings";
import { Class, Prisma, Teacher } from "@prisma/client";
import Image from "next/image";
import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { redirect } from "next/navigation";

type AttendanceList = Class & { supervisor: Teacher };

const AttendanceListPage = async ({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) => {

const { userId, sessionClaims } = await auth();
const role = (sessionClaims?.metadata as { role?: string })?.role;
const resolvedSearchParams = await searchParams;

if (!role || !["admin", "teacher"].includes(role)) {
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
      {item.supervisor.name + " " + item.supervisor.surname}
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

// Build query with role-based filtering
const query: Prisma.ClassWhereInput = {};

// If user is a teacher, only show their classes
if (role === "teacher" && userId) {
  query.lessons = {
    some: {
      teacherId: userId
    }
  }
}

if (queryParams.search) {
  query.OR = [
    { name: { contains: queryParams.search, mode: "insensitive" } },
    { supervisor: { name: { contains: queryParams.search, mode: "insensitive" } } },
    { supervisor: { surname: { contains: queryParams.search, mode: "insensitive" } } },
  ];
}
  // URL PARAMS CONDITION
  const queryParamsFromSearch: Prisma.ClassWhereInput = {};

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
          case "search":
            if (value) {
              query.name = { contains: value, mode: "insensitive" } as Prisma.StringFilter;
            }
            break;
          default:
            break;
        }
      }
    }
  }

  const [data, count] = await prisma.$transaction([
    prisma.class.findMany({
      where: query,
      include: {
        supervisor: true,
      },
      take: ITEM_PER_PAGE,
      skip: ITEM_PER_PAGE * (p - 1),
    }),
    prisma.class.count({ where: query }),
  ]);

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
