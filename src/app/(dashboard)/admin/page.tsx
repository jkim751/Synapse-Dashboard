import Announcements from "@/components/Announcements";
import BigCalendarContainer from "@/components/BigCalendarContainer";
import UserCard from "@/components/UserCard";
import TeacherAdminViewToggle from "@/components/TeacherAdminViewToggle";
import { auth, currentUser } from "@clerk/nextjs/server";


const AdminPage = async ({
  searchParams,
}: {
  searchParams: Promise<{ [keys: string]: string | undefined }>;
}) => {
  // Ensure authentication and get user data
  const { userId, sessionClaims } = await auth();
  const user = await currentUser();
  const role = (sessionClaims?.metadata as { role?: string })?.role;

  // More robust username fallback logic
  const userName = user?.firstName || user?.username || user?.emailAddresses?.[0]?.emailAddress?.split('@')[0] || "Admin";

  const resolvedSearchParams = await searchParams;
  const calendarView = (resolvedSearchParams.calendarView === "teacher" ? "teacher" : "admin") as "admin" | "teacher";
  const isTeacherAdmin = role === "teacher-admin";

  const calendarTitle = isTeacherAdmin && calendarView === "teacher"
    ? "My Schedule"
    : "Master Schedule - All Lessons";

  return (
    <div className="flex flex-col">
      {/* WELCOME MESSAGE */}
      <div className="p-4 pb-2">
        <h1 className="text-xl sm:text-2xl md:text-2xl lg:text-2xl font-bold text-gray-800 mb-2">
          Welcome, {userName}!
        </h1>
        <p className="text-sm sm:text-base text-gray-600">
          Here is your overview of today
        </p>
      </div>

      <div className="p-4 pt-2 flex gap-4 flex-col md:flex-col">
        {/* LEFT */}
        <div className="w-full lg:w-full flex flex-col gap-8">
          {/* USER CARDS */}
          <div className="flex gap-4 justify-between flex-wrap">
            <UserCard type="admin" />
            <UserCard type="teacher" />
            <UserCard type="student" />
            <UserCard type="parent" />
            <UserCard type="enrollment" />
          </div>
          {/* MASTER CALENDAR */}
          <div className="w-full h-[1000px]">
            <div className="bg-white p-4 rounded-md h-full">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-800">{calendarTitle}</h2>
                {isTeacherAdmin && (
                  <TeacherAdminViewToggle currentView={calendarView} />
                )}
              </div>
              <div className="h-[calc(100%-3rem)]">
                <BigCalendarContainer viewMode={calendarView} />
              </div>
            </div>
          </div>

        </div>
        {/* RIGHT */}
        <div className="w-full lg:w-full flex flex-col gap-8">
          <Announcements />
        </div>
      </div>
    </div>
  );
};

export default AdminPage;
