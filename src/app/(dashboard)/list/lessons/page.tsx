import FormContainer from "@/components/FormContainer";
import Pagination from "@/components/Pagination";
import Table from "@/components/Table";
import TableSearch from "@/components/TableSearch";
import prisma from "@/lib/prisma";
import { ITEM_PER_PAGE } from "@/lib/settings";
import { Class, Prisma, RecurringLesson, Subject, Teacher, Lesson } from "@prisma/client";
import { auth } from "@clerk/nextjs/server";

// --- NEW: Define a unified type for your list items ---
// This will represent both single lessons and recurring rules.
export interface UnifiedLesson {
  id: number;
  isRecurring: boolean; // Flag to know which type it is
  name: string;
  subjectName: string;
  className: string;
  teacherName: string;
  details: string;
  // We include the full original object for the "update" form
  originalData: (Lesson | RecurringLesson) & { subject?: Subject | null, class?: Class | null, teacher?: Teacher | null };
}

const LessonListPage = async ({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) => {
  const { sessionClaims } = await auth();
  // Use the roles array
  const userRoles = (sessionClaims?.metadata as { roles?: string[] })?.roles || [];
  const userId = sessionClaims?.sub;

  // --- 1. SETUP QUERIES AND PAGINATION ---
  const page = typeof searchParams.page === 'string' ? parseInt(searchParams.page) : 1;
  const searchTerm = typeof searchParams.search === 'string' ? searchParams.search : undefined;

  // Build the WHERE clauses for both Prisma queries
  const singleLessonQuery: Prisma.LessonWhereInput = { recurringLessonId: null };
  const recurringRuleQuery: Prisma.RecurringLessonWhereInput = {};

  // Apply role-based filters
  if (userRoles.includes('teacher')) {
    singleLessonQuery.teacherId = userId!;
    recurringRuleQuery.teacherId = userId!;
  }
  
  // Apply search term filters
  if (searchTerm) {
    const searchFilter = { contains: searchTerm, mode: "insensitive" as const };
    singleLessonQuery.OR = [
      { name: searchFilter },
      { subject: { name: searchFilter } },
      { teacher: { name: searchFilter } },
    ];
    recurringRuleQuery.OR = [
      { name: searchFilter },
      { subject: { name: searchFilter } },
      { teacher: { name: searchFilter } },
    ];
  }

  // --- 2. FETCH DATA FROM BOTH MODELS ---
  const [singleLessons, recurringRules, singleCount, recurringCount] = await prisma.$transaction([
    // Fetch single lessons
    prisma.lesson.findMany({
      where: singleLessonQuery,
      include: { subject: true, class: true, teacher: true },
    }),
    // Fetch recurring lesson rules
    prisma.recurringLesson.findMany({
      where: recurringRuleQuery,
      include: { subject: true, class: true, teacher: true },
    }),
    // Count single lessons
    prisma.lesson.count({ where: singleLessonQuery }),
    // Count recurring lessons
    prisma.recurringLesson.count({ where: recurringRuleQuery }),
  ]);
  
  // --- 3. TRANSFORM AND COMBINE DATA ---
  const formattedRecurring: UnifiedLesson[] = recurringRules.map(rule => ({
    id: rule.id,
    isRecurring: true,
    name: rule.name,
    subjectName: rule.subject.name,
    className: rule.class.name,
    teacherName: `${rule.teacher.name} ${rule.teacher.surname}`,
    details: 'Recurring Rule', // Simple label for the list view
    originalData: rule,
  }));
  
  const formattedSingle: UnifiedLesson[] = singleLessons.map(lesson => ({
    id: lesson.id,
    isRecurring: false,
    name: lesson.name,
    subjectName: lesson.subject?.name || 'N/A',
    className: lesson.class?.name || 'N/A',
    teacherName: lesson.teacher ? `${lesson.teacher.name} ${lesson.teacher.surname}` : 'N/A',
    details: `Single - ${new Intl.DateTimeFormat("en-GB").format(lesson.startTime)}`,
    originalData: lesson,
  }));
  
  const allLessons = [...formattedRecurring, ...formattedSingle];
  
  // --- 4. PAGINATE THE COMBINED RESULTS ---
  const totalCount = singleCount + recurringCount;
  const paginatedLessons = allLessons.slice(ITEM_PER_PAGE * (page - 1), ITEM_PER_PAGE * page);

  // --- 5. DEFINE COLUMNS AND RENDER LOGIC for the new unified type ---
  const columns = [
    { header: "Lesson Name", accessor: "name" },
    { header: "Type", accessor: "type" },
    { header: "Subject", accessor: "subject" },
    { header: "Class", accessor: "class" },
    { header: "Teacher", accessor: "teacher", className: "hidden md:table-cell" },
    { header: "Actions", accessor: "action" },
  ];

  const renderRow = (item: UnifiedLesson) => (
    <tr
      key={`${item.isRecurring}-${item.id}`} // Unique key for React
      className="border-b border-gray-200 even:bg-slate-50 text-sm hover:bg-lamaPurpleLight"
    >
      <td className="p-4">{item.name}</td>
      <td>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          item.isRecurring ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
        }`}>
          {item.isRecurring ? 'Recurring' : 'Single'}
        </span>
      </td>
      <td>{item.subjectName}</td>
      <td>{item.className}</td>
      <td className="hidden md:table-cell">{item.teacherName}</td>
      <td>
        <div className="flex items-center gap-2">
          {userRoles.includes("admin") && (
            <>
              {/* Pass the original, untransformed data to the update form */}
              <FormContainer table="lesson" type="update" data={item.originalData} />
              {/* The delete action will need to know the type and id */}
              <FormContainer table="lesson" type="delete" id={item.id} />
            </>
          )}
        </div>
      </td>
    </tr>
  );

  return (
    <div className="bg-white p-4 rounded-xl flex-1 m-4 mt-0">
      <div className="flex items-center justify-between">
        <h1 className="hidden md:block text-lg font-semibold">Lessons</h1>
        <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
          <TableSearch />
          <div className="flex items-center gap-4 self-end">
            {userRoles.includes("admin") && (
              <FormContainer table="lesson" type="create" />
            )}
          </div>
        </div>
      </div>
      <Table columns={columns} renderRow={renderRow} data={paginatedLessons} />
      <Pagination page={page} count={totalCount} />
    </div>
  );
};

export default LessonListPage;