import Pagination from "@/components/Pagination";
import Table from "@/components/Table";
import TableSearch from "@/components/TableSearch";
import prisma from "@/lib/prisma";
import { ITEM_PER_PAGE } from "@/lib/settings";
import { Attendance, Lesson, Class, Teacher, Grade, Prisma, Subject, Student } from "@prisma/client";
import Image from "next/image";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import AttendanceMarkButton from "@/components/AttendanceMarkButton";
import AttendanceRow from "@/components/AttendanceRow";
import { min } from "moment";
import DateSelector from "@/components/DateSelector";

type StudentWithAttendance = Student & {
    attendances: (Attendance & { lesson: Lesson })[];
  };

type ClassWithRelations = Class & {
    supervisor: Teacher | null;
    grade: Grade;
  };

  type LessonWithRelations = Lesson & {
    subject: Subject;
    teacher: Teacher;
  };

  const SingleClassAttendancePage = async ({
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

    if (!role || !["admin", "teacher"].includes(role)) {
      redirect("/");
    }

    const classId = parseInt(id);

    // Validate classId
    if (isNaN(classId)) {
      return <div>Invalid class ID</div>;
    }

    // Get class information
    const classInfo = await prisma.class.findUnique({
      where: { id: classId },
      include: {
          supervisor: true,
          grade: true,
      },
    });

    if (!classInfo) {
      return <div>Class not found</div>;
    }
      // Restrict access for teachers to only their classes
  if (role === "teacher" && classInfo.supervisor?.id !== sessionClaims?.userId) {
    redirect("/attendance"); // Redirect to the main attendance page if not their class
  }

    const { page, ...queryParams } = resolvedSearchParams;
    const p = page ? parseInt(page) : 1;

   // Get selected date, default to today
   const today = new Date();
   const selectedDateStr = queryParams.date || today.toISOString().split('T')[0];
   const selectedDate = new Date(selectedDateStr);
   selectedDate.setHours(0, 0, 0, 0); // Normalize to start of the day

   const startOfDay = new Date(selectedDate);
   startOfDay.setHours(0, 0, 0, 0);
   const endOfDay = new Date(selectedDate);
   endOfDay.setHours(23, 59, 59, 999);

    // Build query for students
    const query: Prisma.StudentWhereInput = {
      classes:{
        some: {
          classId: classId,
        },
      },
    };

    if (queryParams.search) {
      query.OR = [
        { name: { contains: queryParams.search, mode: "insensitive" } },
        { surname: { contains: queryParams.search, mode: "insensitive" } },
      ];
    }

    // Get students with their attendance records
    const [students, count] = await prisma.$transaction([
      prisma.student.findMany({
        where: query,
        include: {
          attendances: {
            where: {
              date: {
                gte: startOfDay,
                lte: endOfDay,
              },
            },
            include: {
              lesson: true,
            },
          },
        },
        take: ITEM_PER_PAGE,
        skip: ITEM_PER_PAGE * (p - 1),
        orderBy: { name: "asc" },
      }),
      prisma.student.count({ where: query }),
    ]);

     // Get lessons for the selected date for this class
  const dayLessons = await prisma.lesson.findMany({
    where: {
      classId: classId,
      day: getDayFromDate(selectedDate),
    },
    include: {
      subject: true,
      teacher: true,
    },
    orderBy: { startTime: "asc" },
  });

  // Get attendance data for the selected date
  const attendanceData = await prisma.attendance.findMany({
    where: {
      date: {
        gte: startOfDay,
        lte: endOfDay,
      },
      lesson: {
        classId: classId,
      },
    },
    include: {
      lesson: true,
    },
  });

    const columns = [
      {
        header: "Student",
        accessor: "name",
        className: "text-left",
      },
      {
        header: "Actions",
        accessor: "action",
        className: "text-center min-w-[120px]",
      },
      {
        header: "Overall",
        accessor: "overall",
        className: "text-center min-w-[120px]",
      },

    ];

    const renderRow = (student: StudentWithAttendance) => {
      const attendanceMap = new Map(
        student.attendances.map((att) => [att.lessonId, att.present])
      );
    return (
      <AttendanceRow
        key={student.id}
        student={student}
        attendanceMap={attendanceMap || new Map()}
        todayLessons={dayLessons}
        date={selectedDate}
      />
    );
  };

  return (
    <div className="bg-white p-4 rounded-xl flex-1 m-4 mt-0">
      {/* TOP */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-lg font-semibold">
            Attendance - {classInfo.name}
          </h1>
          <p className="text-sm text-gray-500">
            {classInfo.supervisor?.name} {classInfo.supervisor?.surname} • Grade {classInfo.grade.level}
          </p>
          <p className="text-sm text-gray-500">
          {selectedDate.toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </p>
        </div>
        <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
          <TableSearch />
       {/* Date Picker for history */}
       <form method="GET" action={`/attendance/${classId}`}>
       <DateSelector currentDate={selectedDate} classId={classId} />
            <input type="hidden" name="date" value={selectedDate.toISOString().split('T')[0]} />
          </form>
        </div>
      </div>

      {/* LESSONS INFO */}
      {dayLessons.length > 0 ? (
        <div className="mb-4 p-3 bg-gray-50 rounded-xl">
          <h3 className="font-semibold mb-2">Lessons for {selectedDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}:</h3>
          <div className="flex flex-wrap gap-2">
            {dayLessons.map((lesson) => (
              <span
                key={lesson.id}
                className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs"
              >
                {lesson.subject.name} ({lesson.startTime.toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit'
                })})
              </span>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <p>No lessons scheduled for {selectedDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}</p>
        </div>
      )}

      {/* ATTENDANCE TABLE */}
      {dayLessons.length > 0 ? (
        <>
          <Table columns={columns} renderRow={renderRow} data={students} />
          <Pagination page={p} count={count} />
        </>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <p>No lessons scheduled for today</p>
        </div>
      )}
    </div>
  );
};

// Helper function to get day of week for Prisma enum
function getDayFromDate(date: Date): "MONDAY" | "TUESDAY" | "WEDNESDAY" | "THURSDAY" | "FRIDAY" {
  const days = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];
  const dayName = days[date.getDay()];

  // Only return weekdays, default to MONDAY for weekends
  if (["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"].includes(dayName)) {
    return dayName as "MONDAY" | "TUESDAY" | "WEDNESDAY" | "THURSDAY" | "FRIDAY";
  }
  return "MONDAY";
}

export default SingleClassAttendancePage;