"use client";

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

export interface Thread {
  id: number;
  type: "CLASS" | "DIRECT";
  name: string;
  classId: number | null;
  lastMessage: { content: string; senderName: string; createdAt: string } | null;
  lastReadAt: string | null;
  hasUnread: boolean;
}

interface Props {
  threads: Thread[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  canCreate: boolean;
  onNewChat: () => void;
}

export default function ThreadList({ threads, selectedId, onSelect, canCreate, onNewChat }: Props) {
  return (
    <div className="w-64 flex-shrink-0 border-r border-gray-200 flex flex-col">
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <h2 className="font-semibold text-gray-800 text-sm">Messages</h2>
        {canCreate && (
          <button
            onClick={onNewChat}
            className="text-xs bg-orange-500 text-white px-2.5 py-1 rounded-lg hover:bg-orange-600 transition-colors"
          >
            + New
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {threads.length === 0 && (
          <p className="text-center text-gray-400 text-xs mt-10 px-4">
            No chats yet.
            {canCreate && " Press + New to start one."}
          </p>
        )}
        {threads.map((thread) => (
          <button
            key={thread.id}
            onClick={() => onSelect(thread.id)}
            className={`w-full text-left px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors ${
              selectedId === thread.id ? "bg-orange-50 border-l-[3px] border-l-orange-500" : ""
            }`}
          >
            <div className="flex items-center justify-between mb-0.5">
              <span
                className={`text-sm truncate flex-1 mr-2 ${
                  thread.hasUnread ? "font-semibold text-gray-900" : "font-medium text-gray-700"
                }`}
              >
                {thread.name}
              </span>
              <div className="flex items-center gap-1 flex-shrink-0">
                {thread.lastMessage && (
                  <span className="text-[10px] text-gray-400">
                    {timeAgo(thread.lastMessage.createdAt)}
                  </span>
                )}
                {thread.hasUnread && (
                  <span className="w-2 h-2 rounded-full bg-orange-500 flex-shrink-0" />
                )}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                thread.type === "CLASS"
                  ? "bg-blue-100 text-blue-600"
                  : "bg-gray-100 text-gray-500"
              }`}>
                {thread.type === "CLASS" ? "Group" : "DM"}
              </span>
              {thread.lastMessage && (
                <p className="text-xs text-gray-500 truncate flex-1">
                  {thread.lastMessage.content}
                </p>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
