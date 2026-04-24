import Announcements from "@/components/Announcements";
import BigCalendarContainer from "@/components/BigCalendarContainer";
import AdminScheduleCalendar from "@/components/AdminScheduleCalendar";
import Checklist from "@/components/Checklist";
import Link from "next/link";
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
  const isTeacherAdmin = role === "teacher-admin";
  const rawTab = resolvedSearchParams.tab;
  const tab = rawTab === "schedule" ? "schedule" : rawTab === "my-schedule" && isTeacherAdmin ? "my-schedule" : "master";

  const calendarTitle =
    tab === "schedule" ? "Admin Schedule" :
    tab === "my-schedule" ? "My Schedule" :
    "Master Schedule - All Lessons";

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
          {/* CHECKLISTS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Checklist type="DAILY" />
            <Checklist type="MONTHLY" />
          </div>
          {/* CALENDAR */}
          <div className="w-full h-[500px] md:h-[700px] lg:h-[1000px]">
            <div className="bg-white p-4 rounded-md h-full flex flex-col">
              {/* Header row */}
              <div className="flex items-center gap-4 mb-4 flex-shrink-0">
                <h2 className="text-xl font-semibold text-gray-800">{calendarTitle}</h2>
                {/* Tab bar */}
                <div className="flex bg-gray-100 rounded-xl p-1 text-xs font-medium">
                  <Link
                    href="?tab=master"
                    className={`px-3 py-1.5 rounded-lg transition-colors ${
                      tab === "master" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    Master
                  </Link>
                  <Link
                    href="?tab=schedule"
                    className={`px-3 py-1.5 rounded-lg transition-colors ${
                      tab === "schedule" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    Admin Schedule
                  </Link>
                  {isTeacherAdmin && (
                    <Link
                      href="?tab=my-schedule"
                      className={`px-3 py-1.5 rounded-lg transition-colors ${
                        tab === "my-schedule" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                      }`}
                    >
                      My Schedule
                    </Link>
                  )}
                </div>
              </div>
              {/* Calendar content */}
              <div className="flex-1 min-h-0">
                {tab === "master" && <BigCalendarContainer viewMode="admin" />}
                {tab === "schedule" && <AdminScheduleCalendar />}
                {tab === "my-schedule" && <BigCalendarContainer viewMode="teacher" />}
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
