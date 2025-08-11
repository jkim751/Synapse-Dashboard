import Announcements from "@/components/Announcements";
import BigCalendarContainer from "@/components/BigCalendarContainer";
import prisma from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";

const { userId, sessionClaims } = await auth();
const currentUserId = userId;

const ParentPage = async () => {

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

  const userName: string = (sessionClaims?.name as string) || "Parent";

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
                Childrens Schedule
                {students.length > 1 && (
                  <span className="text-sm text-gray-600 ml-2">
                    ({students.map(s => s.name).join(", ")})
                  </span>
                )}
              </h1>
              <div className="h-[calc(100%-2rem)]">
                {students[0]?.classes?.length > 0 ? (
                  <BigCalendarContainer
                    type="classId"
                    id={students[0].classes.find(c => c.isPrimary)?.classId || students[0].classes[0].classId}
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