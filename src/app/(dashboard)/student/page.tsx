import Announcements from "@/components/Announcements";
import BigCalendarContainer from "@/components/BigCalendarContainer";
import prisma from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";

const StudentPage = async () => {
  const { userId, sessionClaims } = await auth();
  const userName = String(sessionClaims?.firstName || sessionClaims?.name || "Student");

  const student = await prisma.student.findUnique({
    where: {
      id: userId!,
    },
    include: {
      class: true,
    },
  });

  if (!student) {
    return (
      <div className="flex flex-col">
        <div className="p-4 pb-2">
          <h1 className="text-xl sm:text-2xl md:text-2xl lg:text-2xl font-bold text-gray-800 mb-2">
            Welcome, {userName}!
          </h1>
          <p className="text-sm sm:text-base text-gray-600">
            Student record not found. Please contact your administrator.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {/* WELCOME MESSAGE */}
      <div className="p-4 pb-2">
        <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-gray-800 mb-2">
          Welcome, {userName}!
        </h1>
        <p className="text-sm sm:text-base text-gray-600">
          Hope you have a great day!
        </p>
      </div>
       {/* BOTTOM */}
       <div className="mt-4 bg-white rounded-md p-4 h-[900px] overflow-hidden">
          <h1 className="mb-4">Student&apos;s Schedule</h1>
          <div className="h-[calc(100%-2rem)]">
            <BigCalendarContainer type="classId" id={student.class.id} showNotifications={true} />
          </div>
        </div>
      </div>

  );
};

export default StudentPage;
