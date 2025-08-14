import prisma from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";

const Announcements = async () => {
  const { userId, sessionClaims } = await auth();
  // We'll use the 'roles' array for better future-proofing
  const userRoles = (sessionClaims?.metadata as { roles?: string[] })?.roles || [];

  let userClassIds: number[] = [];

  // --- NEW: Step 1 - Get the relevant class IDs based on the user's role ---
  if (userId && !userRoles.includes('admin')) {
    if (userRoles.includes('student')) {
      const studentClasses = await prisma.studentClass.findMany({
        where: { studentId: userId },
        select: { classId: true },
      });
      userClassIds = studentClasses.map(sc => sc.classId);
    } else if (userRoles.includes('teacher')) {
      const teacherClasses = await prisma.class.findMany({
        where: {
          // A teacher is associated with a class if they teach any lesson in it
          lessons: { some: { teacherId: userId } }
        },
        select: { id: true }
      });
      userClassIds = teacherClasses.map(c => c.id);
    } else if (userRoles.includes('parent')) {
      const parentClasses = await prisma.studentClass.findMany({
        where: {
          student: { parentId: userId }
        },
        select: { classId: true },
        distinct: ['classId'] // Get each class ID only once
      });
      userClassIds = parentClasses.map(sc => sc.classId);
    }
  }

  // --- Step 2: Build the final Prisma query ---
  const data = await prisma.announcement.findMany({
    take: 3,
    orderBy: { date: "desc" },
    where: {
      // Admins see everything, so the where clause is empty for them
      // Other roles see global announcements OR announcements for their classes
      ...(userRoles.includes('admin') ? {} : {
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

  // The rest of your rendering logic is perfect and doesn't need to change.
  return (
    <div className="bg-white p-4 rounded-xl">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Announcements</h1>
      </div>
      <div className="flex flex-col gap-4 mt-4">
        {data.length === 0 && <p className="text-sm text-gray-500 mt-2">No announcements found.</p>}
        {data.map((announcement) => (
          <div key={announcement.id} className="bg-lamaSkyLight bg-opacity-10 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <h2 className="font-medium">{announcement.title}</h2>
              <span className="text-xs text-black rounded-xl px-1 py-1">
                {new Intl.DateTimeFormat("en-GB").format(announcement.date)}
              </span>
            </div>
            <p className="text-sm text-black mt-1">{announcement.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Announcements;