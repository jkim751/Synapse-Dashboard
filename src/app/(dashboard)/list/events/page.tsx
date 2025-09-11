import FormContainer from "@/components/FormContainer";
import Pagination from "@/components/Pagination";
import Table from "@/components/Table";
import TableSearch from "@/components/TableSearch";
import prisma from "@/lib/prisma";
import { ITEM_PER_PAGE } from "@/lib/settings";
import { Class, Event, Prisma } from "@prisma/client";
import { auth } from "@clerk/nextjs/server";

type EventList = Event & { class: Class };

const EventListPage = async ({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) => {

  const { userId, sessionClaims } = await auth();
  const role = (sessionClaims?.metadata as { role?: string })?.role;
  const resolvedSearchParams = await searchParams;
  const currentUserId = userId;
  const { classId } = resolvedSearchParams;

  const columns = [
    {
      header: "Title",
      accessor: "title",
    },
    {
      header: "Class",
      accessor: "class",
    },
    {
      header: "Date",
      accessor: "date",
      className: "hidden md:table-cell",
    },
    {
      header: "Start Time",
      accessor: "startTime",
      className: "hidden md:table-cell",
    },
    {
      header: "End Time",
      accessor: "endTime",
      className: "hidden md:table-cell",
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

  const renderRow = (item: EventList) => (
    <tr
      key={item.id}
      className="border-b border-gray-200 even:bg-slate-50 text-sm hover:bg-lamaPurpleLight"
    >
      <td className="flex items-center gap-4 p-4">{item.title}</td>
      <td>{item.class?.name || "-"}</td>
      <td className="hidden md:table-cell">
        {new Intl.DateTimeFormat("en-US").format(item.startTime)}
      </td>
      <td className="hidden md:table-cell">
        {item.startTime.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        })}
      </td>
      <td className="hidden md:table-cell">
        {item.endTime.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        })}
      </td>
      <td>
        <div className="flex items-center gap-2">
          {role === "admin" && (
            <>
              <FormContainer table="event" type="update" data={item} />
              <FormContainer table="event" type="delete" id={item.id} />
            </>
          )}
        </div>
      </td>
    </tr>
  );

  const { page, ...queryParams } = resolvedSearchParams;

  const p = page ? parseInt(page) : 1;

  // URL PARAMS CONDITION

  const query: Prisma.EventWhereInput = {};

  if (queryParams) {
    for (const [key, value] of Object.entries(queryParams)) {
      if (value !== undefined) {
        switch (key) {
          case "search":
            query.title = { contains: value, mode: "insensitive" };
            break;
          default:
            break;
        }
      }
    }
  }

  // ROLE CONDITIONS

  if (role !== "admin") {
    const userSpecificClauses: any[] = [
      // Events for everyone
      {
        classId: null,
        AND: [
          { eventUsers: { none: {} } },
          { eventGrades: { none: {} } },
        ],
      },
      // Events specifically for the user
      { eventUsers: { some: { userId: userId! } } },
    ];

    if (role === "student") {
      const student = await prisma.student.findUnique({
        where: { id: userId! },
        select: { gradeId: true, classes: { select: { classId: true } } },
      });
      if (student) {
        if (student.gradeId) {
          userSpecificClauses.push({ eventGrades: { some: { gradeId: student.gradeId } } });
        }
        const classIds = student.classes.map(c => c.classId);
        if (classIds.length > 0) {
          userSpecificClauses.push({ classId: { in: classIds } });
        }
      }
    } else if (role === "parent") {
      const child = await prisma.student.findFirst({
        where: { parentId: userId! },
        select: { id: true, gradeId: true, classes: { select: { classId: true } } },
      });
      if (child) {
        userSpecificClauses.push({ eventUsers: { some: { userId: child.id } } }); // For their child
        if (child.gradeId) {
          userSpecificClauses.push({ eventGrades: { some: { gradeId: child.gradeId } } });
        }
        const classIds = child.classes.map(c => c.classId);
        if (classIds.length > 0) {
          userSpecificClauses.push({ classId: { in: classIds } });
        }
      }
    } else if (role === "teacher") {
      const teacher = await prisma.teacher.findUnique({
        where: { id: userId! },
        select: { id: true }
      });
      if (teacher) {
        // Teachers can see events for everyone, but not grade-specific events
      }
    }
    query.OR = userSpecificClauses;
  }

  const [data, count] = await prisma.$transaction([
    prisma.event.findMany({
      where: query,
      include: {
        class: true,
        eventUsers: { select: { userId: true } },
        eventGrades: { select: { gradeId: true } },
      },
      take: ITEM_PER_PAGE,
      skip: ITEM_PER_PAGE * (p - 1),
      orderBy: {
        startTime: 'desc'
      }
    }),
    prisma.event.count({ where: query }),
  ]);

  const dataWithDetails = data.map(event => ({
    ...event,
    id: event.id,
    title: event.title,
    description: event.description,
    startTime: event.startTime,
    endTime: event.endTime,
    classId: event.classId,
    class: event.class,
    // Pass users and grades to FormContainer for editing
    users: event.eventUsers.map(eu => ({ id: eu.userId })),
    grades: event.eventGrades.map(eg => ({ id: eg.gradeId })),
  }));

  return (
    <div className="bg-white p-4 rounded-xl flex-1 m-4 mt-0">
      {/* TOP */}
      <div className="flex items-center justify-between">
        <h1 className="hidden md:block text-lg font-semibold">Events</h1>
        <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
          <TableSearch />
          <div className="flex items-center gap-4 self-end">
            {role === "admin" && <FormContainer table="event" type="create" />}
          </div>
        </div>
      </div>
      {/* LIST */}
      <Table columns={columns} renderRow={renderRow} data={dataWithDetails} />
      {/* PAGINATION */}
      <Pagination page={p} count={count} />
    </div>
  );
};

export default EventListPage;
