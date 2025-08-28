import Announcements from "@/components/Announcements";
import BigCalendarContainer from "@/components/BigCalendarContainer";
import { currentUser } from "@clerk/nextjs/server";

const TeacherPage = async () => {
  const user = await currentUser();
  const userId = user?.id;
  const userName = user?.firstName || "Teacher";
  return (
    <div className="h-full flex-1 flex flex-col">
      
      {/* WELCOME MESSAGE */}
      <div className="p-4 pb-2">
        <h1 className="text-xl sm:text-2xl md:text-2xl lg:text-2xl font-bold text-gray-800 mb-2">
          Welcome, {userName}!
        </h1>
        <p className="text-sm sm:text-base text-gray-600">
          Manage your classes and lessons
        </p>
      </div>
    <div className="h-full flex-1 p-4 flex gap-4 flex-col xl:flex-row">
      {/* LEFT */}
      <div className="h-[900px] w-full xl:w-2/3">
        {/* Apply flexbox here */}
        <div className="h-full bg-white p-4 rounded-xl flex flex-col">
          <h1 className="text-xl font-semibold mb-4">Schedule</h1>
          {/* Add a wrapper to take remaining space */}
          <div className="flex-1 min-h-0">
            <BigCalendarContainer
              type="teacherId"
              id={userId!}
              showNotifications={false}
            />
          </div>
        </div>
      </div>
      {/* RIGHT */}
      <div className="w-full lg:w-1/3 flex flex-col gap-8 rounded-xl">
          <Announcements />
      </div>
    </div>
    </div>
  );
};

export default TeacherPage;