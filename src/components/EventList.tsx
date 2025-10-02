import prisma from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { Key, ReactElement, JSXElementConstructor, ReactNode, ReactPortal, AwaitedReactNode } from "react";

const EventList = async ({ dateParam }: { dateParam: string | undefined }) => {
  const date = dateParam ? new Date(dateParam) : new Date();
  const { userId, sessionClaims } = await auth();
  const role = (sessionClaims?.metadata as { role?: string })?.role;

  const startTime = new Date(date.setHours(0, 0, 0, 0));
  const endTime = new Date(date.setHours(23, 59, 59, 999));

  let whereClause: any = {
    startTime: {
      gte: startTime,
      lte: endTime,
    },
  };

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
        const classIds = student.classes.map((c: { classId: any; }) => c.classId);
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
        userSpecificClauses.push({ eventUsers: { some: { userId: child.id } } });
        if (child.gradeId) {
          userSpecificClauses.push({ eventGrades: { some: { gradeId: child.gradeId } } });
        }
        const classIds = child.classes.map((c: { classId: any; }) => c.classId);
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
        // Teachers can see all events - no additional filtering needed
        // or add specific teacher-related event filtering logic here
      }
    }
    whereClause.OR = userSpecificClauses;
  }

  const data = await prisma.event.findMany({
    where: whereClause,
  });

  return data.map((event: { id: Key | null | undefined; title: string | number | bigint | boolean | ReactElement<any, string | JSXElementConstructor<any>> | Iterable<ReactNode> | ReactPortal | Promise<AwaitedReactNode> | null | undefined; startTime: { toLocaleTimeString: (arg0: string, arg1: { hour: string; minute: string; hour12: boolean; }) => string | number | bigint | boolean | ReactElement<any, string | JSXElementConstructor<any>> | Iterable<ReactNode> | ReactPortal | Promise<AwaitedReactNode> | null | undefined; }; description: string | number | bigint | boolean | ReactElement<any, string | JSXElementConstructor<any>> | Iterable<ReactNode> | ReactPortal | Promise<AwaitedReactNode> | null | undefined; }) => (
    <div
      className="p-5 rounded-xl border-2 border-gray-100 border-t-4 odd:border-t-lamaSky even:border-t-lamaPurple"
      key={event.id}
    >
      <div className="flex items-center justify-between">
        <h1 className="font-semibold text-gray-600">{event.title}</h1>
        <span className="text-gray-300 text-xs">
          {event.startTime.toLocaleTimeString("en-UK", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          })}
        </span>
      </div>
      <p className="mt-2 text-gray-400 text-sm">{event.description}</p>
    </div>
  ));
};

export default EventList;
