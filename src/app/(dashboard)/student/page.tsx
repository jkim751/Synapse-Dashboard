import Announcements from "@/components/Announcements";
import BigCalendarContainer from "@/components/BigCalendarContainer";
import prisma from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";

const StudentPage = async () => {
  const { userId } = await auth();

  if (!userId) {
    return <div>Please log in to access this page.</div>;
  }

  const student = await prisma.student.findUnique({
    where: { id: userId },
    include: { 
      classes: { include: { class: true } }
    },
  });

  if (!student) {
    return (
      <div className="flex flex-col">
        <div className="p-4 pb-2">
          <h1 className="text-xl sm:text-2xl md:text-2xl lg:text-2xl font-bold text-gray-800 mb-2">
            Welcome, Student!
          </h1>
          <p className="text-sm sm:text-base text-gray-600">
            Student record not found. Please contact your administrator.
          </p>
        </div>
      </div>
    );
  }

  const userName = student.name || "Student";

  const classes = await prisma.class.findMany({
    where: { students: { some: { studentId: userId } } },
    select: { id: true, name: true },
  });

  const classIds = classes.map(c => c.id);

  if (classIds.length === 0) {
    return (
      <div className="p-6 text-gray-600">
        We couldn&apos;t find any classes linked to your account yet.
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
      <div className="mt-4 ml-4 mr-4 bg-white rounded-xl p-4 h-[900px] overflow-hidden">
        <h1 className="mb-4">Student&apos;s Schedule</h1>
        <div className="h-[calc(100%-2rem)]">
          <BigCalendarContainer
            classIds={classIds}
            showNotifications={true}
          />
        </div>
      </div>
      <div className="w-full lg:w-full flex flex-col gap-8">
          <Announcements />
        </div>
    </div>
  );
};

export default StudentPage;
