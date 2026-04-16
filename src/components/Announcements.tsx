import prisma from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import AnnouncementsClient from "./AnnouncementsClient";

const Announcements = async () => {
  const { userId, sessionClaims } = await auth();
  // We'll use the 'roles' array for better future-proofing
  const userRoles = (sessionClaims?.metadata as { roles?: string[] })?.roles || [];

  let userClassIds: number[] = [];

  // --- NEW: Step 1 - Get the relevant class IDs based on the user's role ---
  if (userId && !userRoles.includes('admin') || userRoles.includes('director')) {
    if (userRoles.includes('student')) {
      const studentClasses = await prisma.studentClass.findMany({
        where: { studentId: userId },
        select: { classId: true },
      });
      userClassIds = studentClasses.map((sc: { classId: any; }) => sc.classId);
    } else if (userRoles.includes('teacher')) {
      const teacherClasses = await prisma.class.findMany({
        where: {
          // A teacher is associated with a class if they teach any lesson in it
          lessons: { some: { teacherId: userId } }
        },
        select: { id: true }
      });
      userClassIds = teacherClasses.map((c: { id: any; }) => c.id);
    } else if (userRoles.includes('parent')) {
      const parentClasses = await prisma.studentClass.findMany({
        where: {
          student: { parentId: userId }
        },
        select: { classId: true },
        distinct: ['classId'] // Get each class ID only once
      });
      userClassIds = parentClasses.map((sc: { classId: any; }) => sc.classId);
    }
  }

  // --- Step 2: Build the final Prisma query ---
  const data = await prisma.announcement.findMany({
    take: 3,
    orderBy: { date: "desc" },
    where: {
      // Admins see everything, so the where clause is empty for them
      // Other roles see global announcements OR announcements for their classes
      ...(userRoles.includes('admin') || userRoles.includes('director') ? {} : {
        OR: [
          {
            // Condition 1: The announcement is global (no class assigned)
            classId: null,
          },
          {
            // Condition 2: The announcement is for one of the user's classes
            classId: {
              in: userClassIds,
            },
          },
        ],
      }),
    },
  });

  return (
    <div className="bg-white p-4 rounded-xl">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Announcements</h1>
      </div>
      <AnnouncementsClient announcements={data.map((a) => ({ ...a, date: a.date.toISOString() }))} userId={userId!} />
    </div>
  );
};

export default Announcements;