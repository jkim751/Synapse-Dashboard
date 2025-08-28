import Announcements from "@/components/Announcements";
import BigCalendarContainer from "@/components/BigCalendarContainer";
import UserCard from "@/components/UserCard";
import { auth, currentUser } from "@clerk/nextjs/server";


const AdminPage = async ({
  searchParams,
}: {
  searchParams: Promise<{ [keys: string]: string | undefined }>;
}) => {
  // Ensure authentication and get user data
  const { userId } = await auth();
  const user = await currentUser();
  
  // More robust username fallback logic
  const userName = user?.firstName || user?.username || user?.emailAddresses?.[0]?.emailAddress?.split('@')[0] || "Admin";
  
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
          </div>
          {/* MASTER CALENDAR */}
          <div className="w-full h-[1000px]">
            <div className="bg-white p-4 rounded-md h-full">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Master Schedule - All Lessons</h2>
              <div className="h-[calc(100%-3rem)]">
                <BigCalendarContainer />
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
