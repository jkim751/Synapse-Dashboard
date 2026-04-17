import FormContainer from "@/components/FormContainer";
import Pagination from "@/components/Pagination";
import Table from "@/components/Table";
import TableSearch from "@/components/TableSearch";
import prisma from "@/lib/prisma";
import { ITEM_PER_PAGE } from "@/lib/settings";
import { Assessment, Prisma } from "@prisma/client";
import { auth } from "@clerk/nextjs/server";
import DocumentList from "@/components/DocumentList";

type AssessmentList = Assessment & {
  lesson?: { subject: { name: string }; class: { name: string }; teacher: { name: string; surname: string } } | null;
  recurringLesson?: { subject: { name: string }; class: { name: string }; teacher: { name: string; surname: string } } | null;
};

const AssessmentListPage = async ({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) => {
  const { userId, sessionClaims } = await auth();
  const role = (sessionClaims?.metadata as { role?: string })?.role;
  const resolvedSearchParams = await searchParams;
  const currentUserId = userId;

  const columns = [
    { header: "Title", accessor: "title" },
    { header: "Type", accessor: "type", className: "hidden md:table-cell" },
    { header: "Subject", accessor: "subject" },
    { header: "Class", accessor: "class" },
    { header: "Teacher", accessor: "teacher", className: "hidden md:table-cell" },
    { header: "Docs", accessor: "docs", className: "hidden md:table-cell" },
    ...(role === "admin" || role === "director" || role === "teacher" || role === "teacher-admin"
      ? [{ header: "Actions", accessor: "action" }]
      : []),
  ];

  const renderRow = (item: AssessmentList) => {
    const lessonData = item.lesson || item.recurringLesson;
    if (!lessonData) return null;

    return (
      <tr
        key={item.id}
        className="border-b border-gray-200 even:bg-slate-50 text-sm hover:bg-lamaPurpleLight"
      >
        <td className="p-4">{item.title}</td>
        <td className="hidden md:table-cell">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
            item.type === "EXAM"
              ? "bg-blue-100 text-blue-700"
              : "bg-purple-100 text-purple-700"
          }`}>
            {item.type === "EXAM" ? "Exam" : "Assignment"}
          </span>
        </td>
        <td>{lessonData.subject.name}</td>
        <td>{lessonData.class.name}</td>
        <td className="hidden md:table-cell">
          {lessonData.teacher.name} {lessonData.teacher.surname}
        </td>
        <td className="hidden md:table-cell">
          <DocumentList documents={item.documents ?? []} type="assessment" />
        </td>
        <td>
          <div className="flex items-center gap-2">
            {(role === "admin" || role === "director" || role === "teacher" || role === "teacher-admin") && (
              <>
                <FormContainer table="assessment" type="update" data={item} />
                <FormContainer table="assessment" type="delete" id={item.id} />
              </>
            )}
          </div>
        </td>
      </tr>
    );
  };

  const { page, ...queryParams } = resolvedSearchParams;
  const p = page ? parseInt(page) : 1;

  const query: Prisma.AssessmentWhereInput = {};

  if (queryParams) {
    for (const [key, value] of Object.entries(queryParams)) {
      if (!value) continue;
      switch (key) {
        case "classId":
          query.OR = [
            { lesson: { classId: parseInt(value) } },
            { recurringLesson: { classId: parseInt(value) } },
          ];
          break;
        case "teacherId":
          query.OR = [
            { lesson: { teacherId: value } },
            { recurringLesson: { teacherId: value } },
          ];
          break;
        case "search":
          query.OR = [
            { title: { contains: value, mode: "insensitive" } },
            { lesson: { subject: { name: { contains: value, mode: "insensitive" } } } },
            { recurringLesson: { subject: { name: { contains: value, mode: "insensitive" } } } },
          ];
          break;
        default:
          break;
      }
    }
  }

  switch (role) {
    case "teacher":
      query.OR = [
        { lesson: { teacherId: currentUserId! } },
        { recurringLesson: { teacherId: currentUserId! } },
      ];
      break;
    case "student":
      query.OR = [
        { lesson: { class: { students: { some: { studentId: currentUserId! } } } } },
        { recurringLesson: { class: { students: { some: { studentId: currentUserId! } } } } },
      ];
      break;
    case "parent":
      query.OR = [
        { lesson: { class: { students: { some: { student: { parentId: currentUserId! } } } } } },
        { recurringLesson: { class: { students: { some: { student: { parentId: currentUserId! } } } } } },
      ];
      break;
    default:
      break;
  }

  const [data, count] = await prisma.$transaction([
    prisma.assessment.findMany({
      where: query,
      include: {
        lesson: {
          select: {
            subject: { select: { name: true } },
            teacher: { select: { name: true, surname: true } },
            class: { select: { name: true } },
          },
        },
        recurringLesson: {
          select: {
            subject: { select: { name: true } },
            teacher: { select: { name: true, surname: true } },
            class: { select: { name: true } },
          },
        },
      },
      orderBy: { title: "asc" },
      take: ITEM_PER_PAGE,
      skip: ITEM_PER_PAGE * (p - 1),
    }),
    prisma.assessment.count({ where: query }),
  ]);

  return (
    <div className="bg-white p-4 rounded-xl flex-1 m-4 mt-0">
      <div className="flex items-center justify-between">
        <h1 className="hidden md:block text-lg font-semibold">Assessments</h1>
        <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
          <TableSearch />
          <div className="flex items-center gap-4 self-end">
            {(role === "admin" || role === "director" || role === "teacher" || role === "teacher-admin") && (
              <FormContainer table="assessment" type="create" />
            )}
          </div>
        </div>
      </div>
      <Table columns={columns} renderRow={renderRow} data={data} />
      <Pagination page={p} count={count} />
    </div>
  );
};

export default AssessmentListPage;
