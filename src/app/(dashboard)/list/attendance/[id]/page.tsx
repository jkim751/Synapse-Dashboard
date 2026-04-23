import Pagination from "@/components/Pagination";
import Table from "@/components/Table";
import TableSearch from "@/components/TableSearch";
import prisma from "@/lib/prisma";
import { ITEM_PER_PAGE } from "@/lib/settings";
import { Attendance, Lesson, Class, Teacher, Grade, Prisma, Subject, Student } from "@prisma/client";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import AttendanceRow from "@/components/AttendanceRow";
import DateSelector from "@/components/DateSelector";
import MakeupClassButton from "@/components/MakeupClassButton";
import { doesRecurringLessonOccurOnDate, getDayFromDate, isDateWithinLessonPeriod } from "@/lib/rruleUtils";

type StudentWithAttendance = Student & {
    attendances: (Attendance & { lesson: Lesson })[];
  };

type ClassWithRelations = Class & {
    grade: Grade;
  };

  type LessonWithRelations = Lesson & {
    subject: Subject;
    teacher: Teacher;
  };

type AttendanceStatus = "present" | "absent" | "trial" | "makeup" | "cancelled";

const SingleClassAttendancePage = async ({
    params,
    searchParams,
  }: {
    params: Promise<{ id: string }>;
    searchParams: Promise<{ [key: string]: string | undefined }>;
  }) => {
    const { id } = await params;
    const { userId, sessionClaims } = await auth();
    const role = (sessionClaims?.metadata as { role?: string })?.role;
    const userRoles = role ? [role] : [];
    const resolvedSearchParams = await searchParams;

    if (!userRoles.includes("admin") && !userRoles.includes("director") && !userRoles.includes("teacher")) {
      redirect("/"); // Redirect non-admins/teachers immediately
    }

    const classId = parseInt(id);

    // Validate classId
    if (isNaN(classId)) {
      return <div>Invalid class ID</div>;
    }

    const classInfo = await prisma.class.findUnique({
      where: { id: classId },
      include: {
        grade: true,
      },
    });
  
    if (!classInfo) {
      return <div>Class not found</div>;
    }

    // Resolve supervisor name from Teacher or Admin table
    let supervisorName: string | null = null;
    if (classInfo.supervisorId) {
      const teacher = await prisma.teacher.findUnique({ where: { id: classInfo.supervisorId }, select: { name: true, surname: true } });
      if (teacher) {
        supervisorName = `${teacher.name} ${teacher.surname}`;
      } else {
        const admin = await prisma.admin.findUnique({ where: { id: classInfo.supervisorId }, select: { name: true, surname: true } });
        if (admin) supervisorName = `${admin.name} ${admin.surname}`;
      }
    }

    if (userRoles.includes("teacher")) {
      const isSupervisor = classInfo.supervisorId === userId;

      // Check if the teacher teaches any single OR recurring lesson in this class
      const [lessonCount, recurringLessonCount] = await Promise.all([
        prisma.lesson.count({ where: { classId: classId, teacherId: userId! } }),
        prisma.recurringLesson.count({ where: { classId: classId, teacherId: userId! } }),
      ]);

      const teachesHere = lessonCount > 0 || recurringLessonCount > 0;
  
      // If the teacher is not the supervisor AND does not teach here, redirect.
      if (!isSupervisor && !teachesHere) {
        redirect("/attendance");
      }
    }

    const { page, ...queryParams } = resolvedSearchParams;
    const p = page ? parseInt(page) : 1;

   // Get selected date, default to today
   const today = new Date();
   today.setHours(0, 0, 0, 0);
   
   const selectedDateStr = resolvedSearchParams.date || today.toISOString().split('T')[0];
   const selectedDate = new Date(selectedDateStr);
   selectedDate.setHours(0, 0, 0, 0);

   const startOfDay = new Date(selectedDate);
   startOfDay.setHours(0, 0, 0, 0);
   const endOfDay = new Date(selectedDate);
   endOfDay.setHours(23, 59, 59, 999);

   // Check if selected date is in the past
   const isPastDate = selectedDate < today;

    // Build query for students
    const query: Prisma.StudentWhereInput = {
      classes: {
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

    const needsMakeupData = role === "admin" || role === "director" || role === "teacher-admin";

    // Run all date-dependent queries in parallel
    const [
      [students, count],
      dayLessons,
      makeupLessons,
      allRecurringLessons,
      attendanceData,
      allSubjects,
      allTeachers,
    ] = await Promise.all([
      prisma.$transaction([
        prisma.student.findMany({
          where: query,
          include: {
            attendances: {
              where: { date: { gte: startOfDay, lte: endOfDay } },
              include: { lesson: true, recurringLesson: true },
            },
          },
          take: ITEM_PER_PAGE,
          skip: ITEM_PER_PAGE * (p - 1),
          orderBy: { name: "asc" },
        }),
        prisma.student.count({ where: query }),
      ]),
      // Standalone lessons (recurringLessonId: null) match by day of week.
      // Exception lessons (recurringLessonId != null) were rescheduled to a specific date
      // via drag-and-drop, so match by actual startTime.
      prisma.lesson.findMany({
        where: {
          classId: classId,
          isMakeup: false,
          OR: [
            { recurringLessonId: null, day: getDayFromDate(selectedDate) },
            { recurringLessonId: { not: null }, startTime: { gte: startOfDay, lte: endOfDay } },
          ],
        },
        include: { subject: true, teacher: true },
        orderBy: { startTime: "asc" },
      }),
      prisma.lesson.findMany({
        where: { classId: classId, isMakeup: true, startTime: { gte: startOfDay, lte: endOfDay } },
        include: { subject: true, teacher: true, makeupStudents: { select: { studentId: true } } },
        orderBy: { startTime: "asc" },
      }),
      prisma.recurringLesson.findMany({
        where: { classId: classId },
        include: { subject: true, teacher: true },
        orderBy: { startTime: "asc" },
      }),
      prisma.attendance.findMany({
        where: {
          date: { gte: startOfDay, lte: endOfDay },
          OR: [
            { lesson: { classId: classId } },
            { recurringLesson: { classId: classId } },
          ],
        },
        include: { lesson: true, recurringLesson: true },
      }),
      needsMakeupData ? prisma.subject.findMany({ orderBy: { name: "asc" } }) : Promise.resolve([]),
      needsMakeupData ? prisma.teacher.findMany({ orderBy: { name: "asc" } }) : Promise.resolve([]),
    ]);

    // Track which recurring series have an exception on this date so we can
    // suppress the parent recurring occurrence (avoid double-showing).
    const exceptionRecurringIds = new Set(
      dayLessons
        .filter((l: any) => l.recurringLessonId !== null)
        .map((l: any) => l.recurringLessonId as number)
    );

    // Filter recurring lessons to only those that actually occur on the selected date,
    // excluding any series that already have an exception lesson on this date.
    const dayRecurringLessons = allRecurringLessons.filter((lesson: { id: number; startTime: Date; rrule: string | undefined; }) => {
      if (exceptionRecurringIds.has(lesson.id)) return false;
      if (!lesson.rrule) return false;
      if (!isDateWithinLessonPeriod(lesson.startTime, selectedDate, lesson.rrule)) return false;
      return doesRecurringLessonOccurOnDate(lesson.rrule, lesson.startTime, selectedDate);
    });

    // Combine regular, recurring, and makeup lessons
    const allLessons = [
      ...dayLessons.map((lesson: any) => ({ ...lesson, isRecurring: false, isMakeup: false, type: 'regular' as const, makeupStudentIds: undefined })),
      ...dayRecurringLessons.map((lesson: any) => ({ ...lesson, isRecurring: true, isMakeup: false, type: 'recurring' as const, makeupStudentIds: undefined })),
      ...makeupLessons.map((lesson: any) => ({
        ...lesson,
        isRecurring: false,
        isMakeup: true,
        type: 'regular' as const,
        makeupStudentIds: lesson.makeupStudents.map((ms: any) => ms.studentId) as string[],
      })),
    ].sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

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
      // Create attendance map specifically for the selected date
      const attendanceMap = new Map<string, AttendanceStatus>();
      
      // Get attendance records for this student on the selected date
      const selectedDateAttendance = attendanceData.filter(
        (        att: { studentId: string; }) => att.studentId === student.id
      );
      
      selectedDateAttendance.forEach((att: { status: string; present: any; lessonId: any; recurringLessonId: any; }) => {
        // Map the attendance status, with safe handling of missing status field
        let status: AttendanceStatus = "present";
        
        try {
          if (att.status && typeof att.status === 'string') {
            const validStatuses = ["present", "absent", "trial", "makeup", "cancelled"];
            if (validStatuses.includes(att.status)) {
              status = att.status as AttendanceStatus;
            } else {
              status = att.present ? "present" : "absent";
            }
          } else {
            status = att.present ? "present" : "absent";
          }
        } catch (error) {
          status = att.present ? "present" : "absent";
        }
        
        // Create unique keys for regular and recurring lessons
        if (att.lessonId) {
          attendanceMap.set(`lesson_${att.lessonId}`, status);
        } else if (att.recurringLessonId) {
          attendanceMap.set(`recurring_${att.recurringLessonId}`, status);
        }
      });
      
      // Transform lessons to match expected type with unique IDs.
      // For makeup lessons, filter out if this student isn't enrolled.
      const validLessons = allLessons
        .filter(lesson => lesson.subject && lesson.teacher)
        .filter(lesson => {
          if (lesson.isMakeup && lesson.makeupStudentIds) {
            return lesson.makeupStudentIds.includes(student.id);
          }
          return true;
        })
        .map(lesson => {
          const originalId = lesson.id;
          return {
            ...lesson,
            id: lesson.isRecurring ? `recurring_${originalId}` : `lesson_${originalId}`,
            originalId: originalId,
            originalType: lesson.type,
            subject: { name: lesson.subject!.name },
            teacher: { name: lesson.teacher!.name, surname: lesson.teacher!.surname },
          };
        });
        
      return (
        <AttendanceRow
          key={student.id}
          student={student}
          attendanceMap={attendanceMap}
          todayLessons={validLessons}
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
              {supervisorName ?? "—"} • Grade {classInfo.grade.level}
            </p>
            <p className="text-sm text-gray-500">
            {selectedDate.toLocaleDateString('en-GB', {
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
         <form method="GET" action={`/list/attendance/${classId}`}>
         <DateSelector currentDate={selectedDate} classId={classId} />
              <input type="hidden" name="date" value={selectedDate.toISOString().split('T')[0]} />
            </form>
            {(role === "admin" || role === "director" || role === "teacher-admin") && (
              <MakeupClassButton
                classId={classId}
                students={students.map((s: any) => ({ id: s.id, name: s.name, surname: s.surname }))}
                subjects={allSubjects}
                teachers={allTeachers}
                defaultDate={selectedDateStr}
              />
            )}
          </div>
        </div>

        {/* LESSONS INFO */}
        {allLessons.length > 0 ? (
          <div className="mb-4 p-3 bg-gray-50 rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold">
                Lessons for {selectedDate.toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  month: 'long', 
                  day: 'numeric' 
                })}:
              </h3>
              {isPastDate && (
                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                  Historical Date - You can still update attendance
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {allLessons.map((lesson) => (
                <span
                  key={`${lesson.type}_${lesson.id}`}
                  className={`px-3 py-1 rounded-full text-xs ${
                    lesson.isRecurring 
                      ? 'bg-purple-100 text-purple-800' 
                      : 'bg-blue-100 text-blue-800'
                  }`}
                >
                  {lesson.subject?.name || 'Unknown Subject'} ({lesson.startTime.toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}) {lesson.isRecurring && '(Recurring)'}
                </span>
              ))}
            </div>
            {(() => {
              const recorders = [...new Set(
                attendanceData
                  .map((a: any) => a.recordedByName)
                  .filter(Boolean)
              )] as string[];
              return recorders.length > 0 ? (
                <div className="mt-2 text-xs text-gray-500">
                  Attendance recorded by {recorders.join(", ")}
                </div>
              ) : null;
            })()}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <p>No lessons scheduled for {selectedDate.toLocaleDateString('en-US', { 
              weekday: 'long', 
              month: 'long', 
              day: 'numeric' 
            })}</p>
            {isPastDate && (
              <p className="text-xs mt-2">This is a past date. You can navigate to dates with scheduled lessons to update attendance</p>
            )}
          </div>
        )}

        {/* ATTENDANCE TABLE */}
        {allLessons.length > 0 ? (
          <>
            <Table columns={columns} renderRow={renderRow} data={students} />
            <Pagination page={p} count={count} />
          </>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <p>No lessons scheduled for this date</p>
          </div>
        )}
      </div>
    );
};

export default SingleClassAttendancePage;