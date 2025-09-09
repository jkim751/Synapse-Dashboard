import { UserButton } from "@clerk/nextjs";
import { currentUser } from "@clerk/nextjs/server";
import Image from "next/image";
import NotificationButton from "./NotificationButton";
import PhotoSyncButton from "./PhotoSyncButton";
import { getUserPhoto } from "@/lib/utils";

const Navbar = async () => {
  const user = await currentUser();
  const userName = user?.firstName;
  const userRole = (user?.publicMetadata?.role as string);
  const userId = user?.id;

  // Get the user's photo (database first, then Clerk fallback)
  const userPhoto = userId && userRole ? await getUserPhoto(userId, userRole) : null;
  const clerkPhoto = user?.imageUrl;

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
        
        {/* User Photo with Sync Option */}
        <div className="flex items-center gap-2">
          <div className="relative">
            {userPhoto && (
              <Image
                src={userPhoto}
                alt="User"
                width={32}
                height={32}
                className="rounded-full object-cover"
              />
            )}
            {userId && userRole && (
              <PhotoSyncButton
                userPhoto={userPhoto}
                clerkPhoto={clerkPhoto ?? null}
                userId={userId}
                userRole={userRole}
              />
            )}
          </div>
          
          <div className="flex flex-col">
            <span className="text-xs leading-3 font-medium">{userName}</span>
            <span className="text-[10px] text-gray-500 text-right">
              {userRole}
            </span>
          </div>
        </div>
        
        <UserButton />
      </div>
    </div>
  );
};

export default Navbar;