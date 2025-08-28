
import FormContainer from "@/components/FormContainer";
import Pagination from "@/components/Pagination";
import Table from "@/components/Table";
import TableSearch from "@/components/TableSearch";
import prisma from "@/lib/prisma";
import { ITEM_PER_PAGE } from "@/lib/settings";
import { Class, Grade, Prisma, Student } from "@prisma/client";
import Image from "next/image";
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";

type StudentList = Student & { classes: Class; grade: Grade };

const SingleClassPage = async ({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) => {
  const { id } = await params;
  const { sessionClaims } = await auth();
  const role = (sessionClaims?.metadata as { role?: string })?.role;
  const resolvedSearchParams = await searchParams;

  const classId = parseInt(id);

  if (isNaN(classId)) {
    return notFound();
  }

  // Get class information
  const classInfo = await prisma.class.findUnique({
    where: { id: classId },
    include: {
      supervisor: true,
      grade: true,
      _count: { select: { students: true } },
    },
  });

  if (!classInfo) {
    return notFound();
  }

  const columns = [
    {
      header: "Info",
      accessor: "info",
    },
    {
      header: "Grade",
      accessor: "grade",
      className: "hidden md:table-cell",
    },
    {
      header: "Phone",
      accessor: "phone",
      className: "hidden lg:table-cell",
    },
    {
      header: "Address",
      accessor: "address",
      className: "hidden lg:table-cell",
    },
    ...(role === "admin"
      ? [
          {
            header: "Actions",
            accessor: "action",
          },
        ]
      : []),
  ];

  const renderRow = (item: StudentList) => (
    <tr
      key={item.id}
      className="border-b border-gray-200 even:bg-slate-50 text-sm hover:bg-lamaPurpleLight"
    >
      <td className="flex items-center gap-4 p-4">
        <Image
          src={item.img || "/noAvatar.png"}
          alt=""
          width={40}
          height={40}
          className="md:hidden xl:block w-10 h-10 rounded-full object-cover"
        />
        <div className="flex flex-col">
          <h3 className="font-semibold">{item.name}</h3>
          <p className="text-xs text-gray-500">{item?.email}</p>
        </div>
      </td>
      <td className="hidden md:table-cell">{item.grade?.level}</td>
      <td className="hidden lg:table-cell">{item.phone}</td>
      <td className="hidden lg:table-cell">{item.address}</td>
      <td>
        <div className="flex items-center gap-2">
          <Link href={`/list/students/${item.id}`}>
            <button className="w-7 h-7 flex items-center justify-center rounded-full bg-orange-200">
              <Image src="/view.png" alt="" width={16} height={16} />
            </button>
          </Link>
          {role === "admin" && (
            <>
              <FormContainer table="student" type="update" data={item} />
              <FormContainer table="student" type="delete" id={item.id} />
            </>
          )}
        </div>
      </td>
    </tr>
  );

  const { page, ...queryParams } = resolvedSearchParams;
  const p = page ? parseInt(page) : 1;

  // Build query for students in this class
  const query: Prisma.StudentWhereInput = {
    classes: {
      some: {
        classId: classId
      },
    },
  };

  if (queryParams) {
    for (const [key, value] of Object.entries(queryParams)) {
      if (value !== undefined) {
        switch (key) {
          case "search":
            query.OR = [
              { name: { contains: value, mode: "insensitive" } },
              { surname: { contains: value, mode: "insensitive" } },
              { email: { contains: value, mode: "insensitive" } },
            ];
            break;
          default:
            break;
        }
      }
    }
  }

  const [data, count] = await prisma.$transaction([
    prisma.student.findMany({
      where: query,
      include: {
        classes: true,
        grade: true,
      },
      take: ITEM_PER_PAGE,
      skip: ITEM_PER_PAGE * (p - 1),
      orderBy: { name: "asc" },
    }),
    prisma.student.count({ where: query }),
  ]);

  return (
    <div className="bg-white p-4 rounded-xl flex-1 m-4 mt-0">
      {/* TOP */}
      <div className="flex items-center justify-between mb-4">
        <div>
        <div className="flex items-center gap-4 mb-2">
          <h1 className="hidden md:block text-lg font-semibold">
            {classInfo.name} - Students
          </h1>
            {role === "admin" && (
              <FormContainer table="class" type="update" data={classInfo} />
            )}
          </div>
          <div className="text-sm text-gray-500 mt-1">
            <p>Grade: {classInfo.grade?.level}</p>
            <p>Supervisor: {classInfo.supervisor?.name} {classInfo.supervisor?.surname}</p>
            <p>Count: {classInfo._count.students}</p>
          </div>
        </div>
        <Link 
          href="/list/classes" 
          className="bg-orange-200 px-4 py-2 rounded-xl text-sm font-medium hover:bg-orange-300 transition-colors"
        >
          Back to Classes
        </Link>
      </div>
      
      {/* SEARCH AND ACTIONS */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
          <TableSearch />
          <div className="flex items-center gap-4 self-end">
            {role === "admin" && <FormContainer table="student" type="create" />}
          </div>
        </div>
      </div>
      
      {/* LIST */}
      <Table columns={columns} renderRow={renderRow} data={data} />
      
      {/* PAGINATION */}
      <Pagination page={p} count={count} />
    </div>
  );
};

export default SingleClassPage;
