"use client";

import { useState, useEffect, useCallback } from "react";
import ThreadList, { Thread } from "./ThreadList";
import MessageArea from "./MessageArea";
import NewChatModal from "./NewChatModal";

interface Props {
  role: string;
  userId: string;
}

export default function ChatShell({ role, userId }: Props) {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [selectedThreadId, setSelectedThreadId] = useState<number | null>(null);
  const [showNewChat, setShowNewChat] = useState(false);

  const fetchThreads = useCallback(async () => {
    const res = await fetch("/api/chat/threads");
    if (res.ok) setThreads(await res.json());
  }, []);

  useEffect(() => {
    fetchThreads();
    const interval = setInterval(fetchThreads, 30000);
    return () => clearInterval(interval);
  }, [fetchThreads]);

  const canCreate = role === "teacher" || role === "teacher-admin" || role === "student";
  const canSend = role !== "admin" && role !== "director";

  const selectedThread = threads.find((t) => t.id === selectedThreadId);

  return (
    <div className="flex h-[calc(100vh-220px)] min-h-[400px] bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
      <ThreadList
        threads={threads}
        selectedId={selectedThreadId}
        onSelect={(id) => setSelectedThreadId(id)}
        canCreate={canCreate}
        onNewChat={() => setShowNewChat(true)}
      />

      {selectedThread ? (
        <MessageArea
          key={selectedThreadId}
          threadId={selectedThread.id}
          threadName={selectedThread.name}
          threadType={selectedThread.type}
          role={role}
          userId={userId}
          canSend={canSend}
          onMessageSent={fetchThreads}
        />
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-gray-400 gap-2">
          <svg className="w-10 h-10 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
          <p className="text-sm">Select a conversation to start chatting</p>
        </div>
      )}

      {showNewChat && (
        <NewChatModal
          role={role}
          onClose={() => setShowNewChat(false)}
          onCreated={(id) => {
            setShowNewChat(false);
            fetchThreads();
            setSelectedThreadId(id);
          }}
        />
      )}
    </div>
  );
}
