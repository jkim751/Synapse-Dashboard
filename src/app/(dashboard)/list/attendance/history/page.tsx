import Pagination from "@/components/Pagination";
import Table from "@/components/Table";
import TableSearch from "@/components/TableSearch";
import prisma from "@/lib/prisma";
import { ITEM_PER_PAGE } from "@/lib/settings";
import { Attendance, Lesson, Prisma, Student, Class, Subject, Teacher } from "@prisma/client";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import DateFilter from "@/components/DateFilter";

type AttendanceWithDetails = Attendance & {
  student: Student;
  lesson: Lesson & {
    subject: Subject;
    class: Class;
    teacher: Teacher;
  };
};

const AttendanceHistoryPage = async ({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) => {
  const { userId, sessionClaims } = await auth();
  const resolvedSearchParams = await searchParams;
  const role = (sessionClaims?.metadata as { role?: string })?.role;


  if (!role || !["admin", "teacher"].includes(role)) {
    redirect("/");
  }

  const { page, ...queryParams } = resolvedSearchParams;
  const p = page ? parseInt(page) : 1;

  // Date filtering
  const fromDate = queryParams.from ? new Date(queryParams.from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
  const toDate = queryParams.to ? new Date(queryParams.to) : new Date();

  // Build query with role-based filtering
  const query: Prisma.AttendanceWhereInput = {
    date: {
      gte: fromDate,
      lte: toDate,
    },
  };

  // If user is a teacher, only show attendance for their classes
  if (role === "teacher" && userId) {
    query.lesson = {
      teacherId: userId,
    };
  }

  if (queryParams.search) {
    query.OR = [
      { student: { name: { contains: queryParams.search, mode: "insensitive" } } },
      { student: { surname: { contains: queryParams.search, mode: "insensitive" } } },
      { lesson: { subject: { name: { contains: queryParams.search, mode: "insensitive" } } } },
      { lesson: { class: { name: { contains: queryParams.search, mode: "insensitive" } } } },
    ];
  }

  const [attendanceRecords, count] = await prisma.$transaction([
    prisma.attendance.findMany({
      where: query,
      include: {
        student: true,
        lesson: {
          include: {
            subject: true,
            class: true,
            teacher: true,
          },
        },
      },
      take: ITEM_PER_PAGE,
      skip: ITEM_PER_PAGE * (p - 1),
      orderBy: { date: "desc" },
    }),
    prisma.attendance.count({ where: query }),
  ]);

  const columns = [
    {
      header: "Date",
      accessor: "date",
      className: "text-left min-w-[100px]",
    },
    {
      header: "Student",
      accessor: "student",
      className: "text-left min-w-[150px]",
    },
    {
      header: "Class",
      accessor: "class",
      className: "text-left min-w-[100px]",
    },
    {
      header: "Subject",
      accessor: "subject",
      className: "text-left min-w-[120px]",
    },
    {
      header: "Teacher",
      accessor: "teacher",
      className: "text-left min-w-[120px]",
    },
    {
      header: "Status",
      accessor: "status",
      className: "text-center min-w-[80px]",
    },
  ];

  const renderRow = (record: AttendanceWithDetails) => (
    <tr
      key={record.id}
      className="border-b border-gray-200 even:bg-slate-50 text-sm hover:bg-lamaPurpleLight"
    >
      <td className="p-4">
        {new Date(record.date).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })}
      </td>
      <td className="p-4">
        <Link
          href={`/list/students/${record.student.id}`}
          className="text-black-600 hover:underline"
        >
          {record.student.name} {record.student.surname}
        </Link>
      </td>
      <td className="p-4">
        <Link
          href={`/list/attendance/${record.lesson.class.id}`}
          className="text-black-600 hover:underline"
        >
          {record.lesson.class.name}
        </Link>
      </td>
      <td className="p-4">{record.lesson.subject.name}</td>
      <td className="p-4">
        {record.lesson.teacher.name} {record.lesson.teacher.surname}
      </td>
      <td className="p-4 text-center">
        <span
          className={`px-3 py-1 rounded-full text-xs font-semibold ${
            record.present
              ? "bg-green-100 text-green-800"
              : "bg-red-100 text-red-800"
          }`}
        >
          {record.present ? "Present" : "Absent"}
        </span>
      </td>
    </tr>
  );

  return (
    <div className="bg-white p-4 rounded-xl flex-1 m-4 mt-0">
      {/* TOP */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-semibold">Attendance History</h1>
        <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
          <TableSearch />
          <DateFilter fromDate={fromDate} toDate={toDate} />
        </div>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-50 p-4 rounded-xl">
          <h3 className="text-lg font-semibold text-gray-700">Total Records</h3>
          <p className="text-2xl font-bold text-orange-600">{count}</p>
        </div>
        <div className="bg-gray-50 p-4 rounded-xl">
          <h3 className="text-lg font-semibold text-gray-700">Present</h3>
          <p className="text-2xl font-bold text-green-600">
            {attendanceRecords.filter(r => r.present).length}
          </p>
        </div>
        <div className="bg-gray-50 p-4 rounded-xl">
          <h3 className="text-lg font-semibold text-gray-700">Absent</h3>
          <p className="text-2xl font-bold text-red-600">
            {attendanceRecords.filter(r => !r.present).length}
          </p>
        </div>
      </div>

      {/* TABLE */}
      <Table columns={columns} renderRow={renderRow} data={attendanceRecords} />
      <Pagination page={p} count={count} />
    </div>
  );
};

export default AttendanceHistoryPage;
