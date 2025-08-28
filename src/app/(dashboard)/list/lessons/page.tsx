import FormContainer from "@/components/FormContainer";
import Pagination from "@/components/Pagination";
import Table from "@/components/Table";
import TableSearch from "@/components/TableSearch";
import prisma from "@/lib/prisma";
import { ITEM_PER_PAGE } from "@/lib/settings";
import { Prisma } from "@prisma/client";
import { auth } from "@clerk/nextjs/server";

// Unified row for both single lessons and recurring lessons
type LessonRow = {
  id: string;                              // "L-12" or "R-5"
  kind: "single" | "recurring";
  subject: { name: string };
  class: { name: string };
  teacher: { name: string; surname: string };
  // For actions if you need them later:
  lessonId?: number;
  recurringId?: number;
};

const LessonListPage = async ({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) => {
  const { sessionClaims } = await auth();
  const role = (sessionClaims?.metadata as { role?: string })?.role;
  const userId = sessionClaims?.sub;
  const resolvedSearchParams = await searchParams;

  const columns = [
    { header: "Subject Name", accessor: "name" },
    { header: "Class", accessor: "classes" },
    { header: "Teacher", accessor: "teacher", className: "hidden md:table-cell" },
    ...(role === "admin" ? [{ header: "Actions", accessor: "action" }] : []),
  ];

  const renderRow = (item: LessonRow) => (
    <tr
      key={item.id}
      className="border-b border-gray-200 even:bg-slate-50 text-sm hover:bg-lamaPurpleLight"
    >
      <td className="flex items-center gap-2 p-4">
        {item.kind === "recurring" && <></>}
        <span>{item.subject.name}</span>
      </td>
      <td>{item.class.name}</td>
      <td className="hidden md:table-cell">
        {item.teacher.name + " " + item.teacher.surname}
      </td>
      <td>
        <div className="flex items-center gap-2">
          {role === "admin" && item.kind === "single" && (
            <>
              <FormContainer table="lesson" type="update" data={{ id: item.lessonId }} />
              <FormContainer table="lesson" type="delete" id={item.lessonId!} />
            </>
          )}
          {role === "admin" && item.kind === "recurring" && (
            <>
              <FormContainer table="recurringLesson" type="update" data={{ id: item.recurringId }} />
              <FormContainer table="recurringLesson" type="delete" id={item.recurringId!} />
            </>
          )}
        </div>
      </td>
    </tr>
  );

  const { page, ...queryParams } = resolvedSearchParams;
  const p = page ? parseInt(page) : 1;

  // ---- Build filters for both models (Lesson & RecurringLesson) ----
  const lessonWhere: Prisma.LessonWhereInput = {};
  const recurringWhere: Prisma.RecurringLessonWhereInput = {};

  if (role === "teacher") {
    lessonWhere.teacherId = userId!;
    recurringWhere.teacherId = userId!;
  }

  if (queryParams) {
    for (const [key, value] of Object.entries(queryParams)) {
      if (!value) continue;
      switch (key) {
        case "classId":
          lessonWhere.classId = parseInt(value);
          recurringWhere.classId = parseInt(value);
          break;
        case "teacherId":
          lessonWhere.teacherId = value;
          recurringWhere.teacherId = value;
          break;
        case "search":
          lessonWhere.OR = [
            { subject: { name: { contains: value, mode: "insensitive" } } },
            { teacher: { name: { contains: value, mode: "insensitive" } } },
            { teacher: { surname: { contains: value, mode: "insensitive" } } },
          ];
          recurringWhere.OR = [
            { subject: { name: { contains: value, mode: "insensitive" } } },
            { teacher: { name: { contains: value, mode: "insensitive" } } },
            { teacher: { surname: { contains: value, mode: "insensitive" } } },
          ];
          break;
        default:
          break;
      }
    }
  }

  // ---- Fetch both sets (can’t “UNION” across models in Prisma) ----
  const [lessons, lessonsCount, recurring, recurringCount] = await prisma.$transaction([
    prisma.lesson.findMany({
      where: lessonWhere,
      include: {
        subject: { select: { name: true } },
        class: { select: { name: true } },
        teacher: { select: { name: true, surname: true } },
      },
    }),
    prisma.lesson.count({ where: lessonWhere }),
    prisma.recurringLesson.findMany({
      where: recurringWhere,
      include: {
        subject: { select: { name: true } },
        class: { select: { name: true } },
        teacher: { select: { name: true, surname: true } },
      },
    }),
    prisma.recurringLesson.count({ where: recurringWhere }),
  ]);

  // ---- Normalize to one array and paginate in memory ----
  const singleRows: LessonRow[] = lessons.map((l) => ({
    id: `L-${l.id}`,
    kind: "single",
    subject: l.subject!,
    class: l.class!,
    teacher: l.teacher!,
    lessonId: l.id,
  }));

  const recurringRows: LessonRow[] = recurring.map((r) => ({
    id: `R-${r.id}`,
    kind: "recurring",
    subject: r.subject!,
    class: r.class!,
    teacher: r.teacher!,
    recurringId: r.id,
  }));

  // Example sort: by class then subject
  const merged = [...recurringRows, ...singleRows].sort(
    (a, b) =>
      a.class.name.localeCompare(b.class.name) ||
      a.subject.name.localeCompare(b.subject.name)
  );

  const total = lessonsCount + recurringCount;
  const start = ITEM_PER_PAGE * (p - 1);
  const pageData = merged.slice(start, start + ITEM_PER_PAGE);

  return (
    <div className="bg-white p-4 rounded-xl flex-1 m-4 mt-0">
      {/* TOP */}
      <div className="flex items-center justify-between">
        <h1 className="hidden md:block text-lg font-semibold">Lessons</h1>
        <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
          <TableSearch />
          <div className="flex items-center gap-4 self-end">
            {role === "admin" && <FormContainer table="lesson" type="create" />}
          </div>
        </div>
      </div>

      {/* LIST */}
      <Table columns={columns} renderRow={renderRow} data={pageData} />

      {/* PAGINATION */}
      <Pagination page={p} count={total} />
    </div>
  );
};

export default LessonListPage;