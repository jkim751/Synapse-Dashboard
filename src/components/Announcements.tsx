import prisma from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import AnnouncementsClient from "./AnnouncementsClient";

const Announcements = async () => {
  const { userId, sessionClaims } = await auth();
  const role = (sessionClaims?.metadata as { role?: string })?.role;

  const isAdminRole = role === "admin" || role === "director" || role === "teacher-admin";

  let userClassIds: number[] = [];

  if (userId && !isAdminRole) {
    if (role === "student") {
      const studentClasses = await prisma.studentClass.findMany({
        where: { studentId: userId },
        select: { classId: true },
      });
      userClassIds = studentClasses.map((sc: { classId: number }) => sc.classId);
    } else if (role === "teacher") {
      const teacherClasses = await prisma.class.findMany({
        where: { lessons: { some: { teacherId: userId } } },
        select: { id: true },
      });
      userClassIds = teacherClasses.map((c: { id: number }) => c.id);
    } else if (role === "parent") {
      const parentClasses = await prisma.studentClass.findMany({
        where: { student: { parentId: userId } },
        select: { classId: true },
        distinct: ["classId"],
      });
      userClassIds = parentClasses.map((sc: { classId: number }) => sc.classId);
    }
  }

  const data = await prisma.announcement.findMany({
    take: 3,
    orderBy: { date: "desc" },
    where: isAdminRole
      ? {}
      : {
          OR: [
            { classId: null, allParents: false },
            { classId: { in: userClassIds } },
            ...(role === "parent" ? [{ allParents: true }] : []),
          ],
        },
  });

  return (
    <div className="bg-white p-4 rounded-xl">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Announcements</h1>
      </div>
      <AnnouncementsClient announcements={data.map((a: typeof data[number]) => ({ ...a, date: a.date.toISOString() }))} userId={userId!} />
    </div>
  );
};

export default Announcements;
