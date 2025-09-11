import { UserButton } from "@clerk/nextjs";
import { currentUser } from "@clerk/nextjs/server";
import Image from "next/image";
import NotificationButton from "./NotificationButton";
import { syncUserProfile } from "@/lib/userSync";

const Navbar = async () => {
  const user = await currentUser();
  const userName = user?.firstName;
  const userRole = (user?.publicMetadata?.role as string);

  // Sync user profile on page load if user exists
  if (user && userRole) {
    try {
      await syncUserProfile(user.id, userRole);
    } catch (error) {
      console.error('Error syncing user profile in navbar:', error);
    }
  }

  return (
    <div className="flex items-center justify-between p-4">
      {/* SEARCH BAR */}
      <div className="hidden md:flex items-center gap-2 text-xs rounded-full ring-[1.5px] ring-gray-300 px-2">
        <Image src="/search.png" alt="" width={14} height={14} />
        <input
          type="text"
          placeholder="Search..."
          className="w-[200px] p-2 bg-transparent outline-none"
        />
      </div>
      {/* ICONS AND USER */}
      <div className="flex items-center gap-6 justify-end w-full">
        <div className="bg-white rounded-full w-7 h-7 flex items-center justify-center cursor-pointer relative">
          <NotificationButton />
        </div>
        
        {/* User Info and Clerk Button */}
        <div className="flex items-center gap-3">
          <div className="flex flex-col text-right">
            <span className="text-xs leading-3 font-medium">{userName}</span>
            <span className="text-[10px] text-gray-500">
              {userRole}
            </span>
          </div>
          <UserButton 
            appearance={{
              elements: {
                avatarBox: "w-8 h-8",
              },
            }}
            afterSignOutUrl="/"
          />
        </div>
      </div>
    </div>
  );
};

export default Navbar;