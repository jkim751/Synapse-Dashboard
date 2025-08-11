import prisma from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";

const Announcements = async () => {
  const { userId, sessionClaims } = await auth();
  const role = (sessionClaims?.metadata as { role?: string })?.role;

  const roleConditions = {
    teacher: { lessons: { some: { teacherId: userId! } } },
    student: { students: { some: { studentId: userId! } } } ,
    parent: { students: { some: { student: { parentId: userId! } } } },
  };

  const data = await prisma.announcement.findMany({
    take: 3,
    orderBy: { date: "desc" },
    where: {
      ...(role !== "admin" && {
        OR: [
          { classId: null },
          { class: roleConditions[role as keyof typeof roleConditions] || {} },
        ],
      }),
    },
  });

  return (
    <div className="bg-white p-4 rounded-xl">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Announcements</h1>
      </div>
      <div className="flex flex-col gap-4 mt-4">
        {data[0] && (
          <div className="bg-lamaSkyLight bg-opacity-10 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <h2 className="font-medium">{data[0].title}</h2>
              <span className="text-xs text-black rounded-xl px-1 py-1">
                {new Intl.DateTimeFormat("en-GB").format(data[0].date)}
              </span>
            </div>
            <p className="text-sm text-black mt-1">{data[0].description}</p>
          </div>
        )}
        {data[1] && (
          <div className="bg-lamaSkyLight bg-opacity-10  rounded-xl p-4">
            <div className="flex items-center justify-between">
              <h2 className="font-medium">{data[1].title}</h2>
              <span className="text-xs text-black rounded-xl px-1 py-1">
                {new Intl.DateTimeFormat("en-GB").format(data[1].date)}
              </span>
            </div>
            <p className="text-sm text-black mt-1">{data[1].description}</p>
          </div>
        )}
        {data[2] && (
          <div className="bg-lamaSkyLight bg-opacity-10  rounded-xl p-4">
            <div className="flex items-center justify-between">
              <h2 className="font-medium">{data[2].title}</h2>
              <span className="text-xs text-black rounded-xl px-1 py-1">
                {new Intl.DateTimeFormat("en-GB").format(data[2].date)}
              </span>
            </div>
            <p className="text-sm text-black mt-1">{data[2].description}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Announcements;
