"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface Message {
  id: number;
  senderId: string;
  senderName: string;
  content: string;
  createdAt: string;
}

interface Props {
  threadId: number;
  threadName: string;
  threadType: "CLASS" | "DIRECT";
  role: string;
  userId: string;
  canSend: boolean;
  onMessageSent: () => void;
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit" });
}

function formatDateHeader(dateStr: string): string {
  const d = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" });
}

export default function MessageArea({ threadId, threadName, threadType, role, userId, canSend, onMessageSent }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const latestIdRef = useRef<number | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (messages.length > 0) {
      latestIdRef.current = messages[messages.length - 1].id;
    }
  }, [messages]);

  const markRead = useCallback(async () => {
    await fetch(`/api/chat/threads/${threadId}/read`, { method: "PATCH" });
  }, [threadId]);

  const fetchInitial = useCallback(async () => {
    const res = await fetch(`/api/chat/threads/${threadId}/messages`);
    if (!res.ok) return;
    const data = await res.json();
    setMessages(data.messages);
    setHasMore(data.hasMore);
    setTimeout(() => bottomRef.current?.scrollIntoView(), 50);
  }, [threadId]);

  const poll = useCallback(async () => {
    const latestId = latestIdRef.current;
    if (latestId === null) return;
    const res = await fetch(`/api/chat/threads/${threadId}/messages?after=${latestId}`);
    if (!res.ok) return;
    const data = await res.json();
    if (data.messages.length > 0) {
      setMessages((prev) => [...prev, ...data.messages]);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
      markRead();
    }
  }, [threadId, markRead]);

  useEffect(() => {
    setMessages([]);
    setHasMore(false);
    latestIdRef.current = null;
    fetchInitial().then(() => markRead());
  }, [threadId, fetchInitial, markRead]);

  useEffect(() => {
    const interval = setInterval(poll, 8000);
    return () => clearInterval(interval);
  }, [poll]);

  const loadEarlier = async () => {
    if (!hasMore || loadingMore || messages.length === 0) return;
    setLoadingMore(true);
    const oldestId = messages[0].id;
    const res = await fetch(`/api/chat/threads/${threadId}/messages?cursor=${oldestId}`);
    if (res.ok) {
      const data = await res.json();
      setMessages((prev) => [...data.messages, ...prev]);
      setHasMore(data.hasMore);
    }
    setLoadingMore(false);
  };

  const send = async () => {
    if (!input.trim() || sending) return;
    setSending(true);
    const content = input.trim();
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";

    const res = await fetch(`/api/chat/threads/${threadId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });

    if (res.ok) {
      const msg = await res.json();
      setMessages((prev) => [...prev, msg]);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
      onMessageSent();
      markRead();
    } else {
      setInput(content);
    }
    setSending(false);
    textareaRef.current?.focus();
  };

  // Group messages by date for date headers
  const messageGroups: { date: string; messages: Message[] }[] = [];
  for (const msg of messages) {
    const dateKey = new Date(msg.createdAt).toDateString();
    const last = messageGroups[messageGroups.length - 1];
    if (last && last.date === dateKey) {
      last.messages.push(msg);
    } else {
      messageGroups.push({ date: dateKey, messages: [msg] });
    }
  }

  return (
    <div className="flex-1 flex flex-col min-w-0">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 flex items-center gap-3">
        <div>
          <h3 className="font-semibold text-gray-800 text-sm">{threadName}</h3>
          <p className="text-xs text-gray-400">{threadType === "CLASS" ? "Group chat" : "Direct message"}</p>
        </div>
        {(role === "admin" || role === "director") && (
          <span className="ml-auto text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
            Moderator view
          </span>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1">
        {hasMore && (
          <button
            onClick={loadEarlier}
            disabled={loadingMore}
            className="w-full text-center text-xs text-orange-500 hover:text-orange-600 py-2 disabled:opacity-50"
          >
            {loadingMore ? "Loading..." : "↑ Load earlier messages"}
          </button>
        )}
        {messages.length === 0 && (
          <p className="text-center text-gray-400 text-sm mt-16">No messages yet. Say hello!</p>
        )}

        {messageGroups.map((group) => (
          <div key={group.date}>
            <div className="flex items-center gap-2 my-3">
              <div className="flex-1 h-px bg-gray-100" />
              <span className="text-xs text-gray-400">{formatDateHeader(group.messages[0].createdAt)}</span>
              <div className="flex-1 h-px bg-gray-100" />
            </div>
            {group.messages.map((msg, idx) => {
              const isOwn = msg.senderId === userId;
              const prevMsg = idx > 0 ? group.messages[idx - 1] : null;
              const showSender = !isOwn && (!prevMsg || prevMsg.senderId !== msg.senderId);
              return (
                <div key={msg.id} className={`flex ${isOwn ? "justify-end" : "justify-start"} ${idx > 0 && !showSender ? "mt-0.5" : "mt-2"}`}>
                  <div className={`max-w-[72%] flex flex-col ${isOwn ? "items-end" : "items-start"}`}>
                    {showSender && (
                      <span className="text-xs text-gray-500 mb-1 px-1">{msg.senderName}</span>
                    )}
                    <div
                      className={`px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                        isOwn
                          ? "bg-orange-500 text-white rounded-br-sm"
                          : "bg-gray-100 text-gray-800 rounded-bl-sm"
                      }`}
                    >
                      {msg.content}
                    </div>
                    <span className="text-[10px] text-gray-400 mt-0.5 px-1">
                      {formatTime(msg.createdAt)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      {canSend ? (
        <div className="px-4 py-3 border-t border-gray-200 flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              e.target.style.height = "auto";
              e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="Type a message… (Enter to send, Shift+Enter for new line)"
            className="flex-1 resize-none border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 overflow-hidden"
            rows={1}
          />
          <button
            onClick={send}
            disabled={!input.trim() || sending}
            className="bg-orange-500 text-white px-4 py-2 rounded-xl hover:bg-orange-600 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium flex-shrink-0 transition-colors"
          >
            Send
          </button>
        </div>
      ) : (
        <div className="px-4 py-3 border-t border-gray-200 text-center text-xs text-gray-400">
          You are viewing this conversation as a moderator
        </div>
      )}
    </div>
  );
}
