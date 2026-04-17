import FormContainer from "@/components/FormContainer";
import Pagination from "@/components/Pagination";
import Table from "@/components/Table";
import TableSearch from "@/components/TableSearch";
import prisma from "@/lib/prisma";
import { Admin, Class, Prisma, Subject, Teacher } from "@prisma/client";
import Image from "next/image";
import Link from "next/link";
import { ITEM_PER_PAGE } from "@/lib/settings";
import { auth } from "@clerk/nextjs/server";
import UserPhotoDisplay from "@/components/UserPhotoDisplay";

type TeacherList = Teacher & { subjects: Subject[] } & { classes: Class[] };

const TeacherListPage = async ({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) => {
  const { sessionClaims, userId } = await auth();
  const role = (sessionClaims?.metadata as { role?: string })?.role;
  const resolvedSearchParams = await searchParams;
  const columns = [
    {
      header: "Info",
      accessor: "info",
    },
    {
      header: "Subjects",
      accessor: "subjects",
      className: "hidden md:table-cell pl-4",
    },
    {
      header: "Classes",
      accessor: "classes",
      className: "hidden md:table-cell pl-4",
    },
    {
      header: "Phone",
      accessor: "phone",
      className: "hidden lg:table-cell pl-4 whitespace-nowrap tabular-nums min-w-[14ch]",
    },
    ...((role === "admin" || role === "director" || role === "teacher-admin")
      ? [
          {
            header: "Actions",
            accessor: "action",
            className: "pl-4",
          },
        ]
      : []),
  ];

  const renderRow = (item: TeacherList) => (
    <tr
      key={item.id}
      className="border-b border-gray-200 even:bg-slate-50 text-sm hover:bg-lamaPurpleLight"
    >
      <td className="flex items-center gap-4 p-4">
        <UserPhotoDisplay
          currentPhotoUrl={item.img}
          userId={item.id}
          userRole="teacher"
          userName={item.name}
          userEmail={item.email}
          canEdit={(role === "admin" || role === "director" || role === "teacher-admin")}
          showInfo={true}
        />
      </td>
      <td className="hidden md:table-cell p-4">{item.subjects.map((subject) => subject.name).join(",  ")}</td>
      <td className="hidden md:table-cell p-4">{item.classes.map((classItem) => classItem.name).join(",  ")}</td>
      <td className="hidden lg:table-cell p-4 whitespace-nowrap min-w-[12ch]">{item.phone}</td>
      <td className="p-4">
        <div className="flex items-center gap-2">
          <Link href={`/list/teachers/${item.id}`}>
            <button className="w-7 h-7 flex items-center justify-center rounded-full bg-orange-200">
              <Image src="/view.png" alt="" width={16} height={16} />
            </button>
          </Link>
          {(role === "admin" || role === "director" || role === "teacher-admin") && (
            <FormContainer table="teacher" type="delete" id={item.id} />
          )}
        </div>
      </td>
    </tr>
  );
  const { page, ...queryParams } = resolvedSearchParams;

  const p = page ? parseInt(page) : 1;

  // URL PARAMS CONDITION

  const query: Prisma.TeacherWhereInput = {};

  if (queryParams) {
    for (const [key, value] of Object.entries(queryParams)) {
      if (value !== undefined) {
        switch (key) {
          case "classId":
            query.lessons = {
              some: {
                classId: parseInt(value),
              },
            };
            break;
          case "search":
            query.OR = [
              { name: { contains: value, mode: "insensitive" } },
              { surname: { contains: value, mode: "insensitive" } },
              { email: { contains: value, mode: "insensitive" } },
              { phone: { contains: value, mode: "insensitive" } },
            ];
            break;
          default:
            break;
        }
      }
    }
  }

  // Add condition to filter by teacherId if the user is a teacher
  if (role === "teacher" && userId) {
    query.id = userId;
  }

  const [[data, count], teacherAdmins] = await Promise.all([
    prisma.$transaction([
      prisma.teacher.findMany({
        where: query,
        include: { subjects: true, classes: true },
        take: ITEM_PER_PAGE,
        skip: ITEM_PER_PAGE * (p - 1),
      }),
      prisma.teacher.count({ where: query }),
    ]),
    prisma.admin.findMany({
      where: { role: "teacher-admin" },
      orderBy: [{ name: "asc" }, { surname: "asc" }],
    }),
  ]);

  return (
    <div className="bg-white p-4 rounded-xl flex-1 m-4 mt-0">
      {/* TOP */}
      <div className="flex items-center justify-between">
        <h1 className="hidden md:block text-lg font-semibold">Teachers</h1>
        <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
          <TableSearch />
            <div className="flex items-center gap-4 self-end">
            {(role === "admin" || role === "director" || role === "teacher-admin") && (
              <FormContainer table="teacher" type="create" />
            )}
          </div>
        </div>
      </div>

      {/* TEACHER-ADMINS SECTION */}
      {teacherAdmins.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2 mt-4">
            Teacher-Admins
          </h2>
          <table className="w-full">
            <tbody>
              {teacherAdmins.map((ta: Admin) => (
                <tr
                  key={ta.id}
                  className="border-b border-gray-200 even:bg-slate-50 text-sm hover:bg-lamaPurpleLight"
                >
                  <td className="flex items-center gap-4 p-4">
                    <UserPhotoDisplay
                      currentPhotoUrl={ta.img}
                      userId={ta.id}
                      userRole="teacher-admin"
                      userName={`${ta.name} ${ta.surname}`}
                      userEmail={ta.email}
                      canEdit={role === "admin" || role === "director" || role === "teacher-admin"}
                      showInfo={true}
                    />
                    <span className="ml-2 text-xs font-medium px-2 py-0.5 rounded-full bg-orange-100 text-orange-600">
                      Teacher-Admin
                    </span>
                  </td>
                  <td className="hidden md:table-cell p-4 text-gray-400">—</td>
                  <td className="hidden md:table-cell p-4 text-gray-400">—</td>
                  <td className="hidden lg:table-cell p-4 whitespace-nowrap">{ta.phone ?? "—"}</td>
                  {(role === "admin" || role === "director" || role === "teacher-admin") && (
                    <td className="p-4">
                      <FormContainer table="admin" type="update" data={ta} id={ta.id} />
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          <div className="border-b border-gray-300 my-4" />
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Teachers
          </h2>
        </div>
      )}

      {/* LIST */}
      <Table columns={columns} renderRow={renderRow} data={data} />
      {/* PAGINATION */}
      <Pagination page={p} count={count} />
    </div>
  );
};

export default TeacherListPage;
