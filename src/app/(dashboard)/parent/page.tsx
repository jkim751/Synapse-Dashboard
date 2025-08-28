import Announcements from "@/components/Announcements";
import BigCalendarContainer from "@/components/BigCalendarContainer";
import prisma from "@/lib/prisma";
import { auth, currentUser } from "@clerk/nextjs/server";

const ParentPage = async () => {
  const user = await currentUser();
  const currentUserId = user?.id;
  const { userId } = await auth();

  const students = await prisma.student.findMany({
    where: {
      parentId: currentUserId!,
    },
    include: {
      classes: {
        include: {
          class: true,
        },
      },
    },
  });

  const userName: string = user?.firstName || "Parent";
  
  const classes = await prisma.class.findMany({
    where: { students: { some: { student: { parentId: userId } } } },
    select: { id: true, name: true },
  });

  const classIds = classes.map(c => c.id);

  if (classIds.length === 0) {
    return (
      <div className="p-6 text-gray-600">
        We couldn’t find any classes for your children yet.
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* WELCOME MESSAGE */}
      <div className="p-4 pb-2">
        <h1 className="text-xl sm:text-2xl md:text-2xl lg:text-2xl font-bold text-gray-800 mb-2">
          Welcome, {userName}!
        </h1>
        <p className="text-sm sm:text-base text-gray-600">
          Monitor your childrens progress
        </p>
      </div>
      <div className="flex-1 p-4 flex gap-4 flex-col xl:flex-row">
        <div className="w-full xl:w-2/3">
          {students.length > 0 ? (
            <div className="bg-white p-4 rounded-xl h-[850px]">
              <h1 className="text-xl font-semibold mb-4">
                Their Schedules
                {students.length > 1 && (
                  <span className="text-sm text-gray-600 ml-2">
                    ({students.map(s => s.name).join(", ")})
                  </span>
                )}
              </h1>
              <div className="h-[calc(100%-3rem)]">
                {students[0]?.classes?.length > 0 ? (
                  <BigCalendarContainer
                    classIds={classIds}
                    showNotifications={false}
                  />
                ) : (
                  <p>No class assigned to display calendar</p>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white p-4 rounded-xl">
              <p className="text-gray-500">No students found for this parent.</p>
            </div>
          )}
        </div>
        {/* RIGHT */}
        <div className="w-full xl:w-1/3 flex flex-col gap-8">
          <Announcements />
        </div>
      </div>
    </div>
  );
};

export default ParentPage;