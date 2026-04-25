import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import ChatShell from "@/components/chat/ChatShell";
import { getSenderName } from "@/lib/chatUtils";

const ALLOWED_ROLES = ["admin", "director", "teacher-admin", "teacher", "student"];

export default async function ChatPage() {
  const { userId, sessionClaims } = await auth();
  const role = (sessionClaims?.metadata as { role?: string })?.role;

  if (!userId || !role || !ALLOWED_ROLES.includes(role)) redirect("/");

  const userName = await getSenderName(userId, role);

  return (
    <div className="p-4 flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-gray-800">Chat</h1>
      <ChatShell role={role} userId={userId} userName={userName} />
    </div>
  );
}
