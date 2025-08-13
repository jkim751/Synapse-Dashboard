import { UserButton } from "@clerk/nextjs";
import { currentUser } from "@clerk/nextjs/server"; // Use currentUser for simplicity
import Image from "next/image";
import NotificationButton from "./NotificationButton";

// Make the component async to use await inside it
const Navbar = async () => {
  // 1. Fetch the user data INSIDE the component
  const user = await currentUser();

  // 2. Safely get the user's name and role. Provide fallbacks for when the user is not logged in.
  const userName = user?.firstName || "User";
  const userRole = (user?.publicMetadata?.role as string) || "Role";

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
        <div className="flex flex-col">
          {/* 3. Use the derived variables */}
          <span className="text-xs leading-3 font-medium">{userName}</span>
          <span className="text-[10px] text-gray-500 text-right">
            {userRole}
          </span>
        </div>
        <UserButton />
      </div>
    </div>
  );
};

export default Navbar;