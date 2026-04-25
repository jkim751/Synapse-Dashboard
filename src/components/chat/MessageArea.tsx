"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface Message {
  id: number;
  senderId: string;
  senderName: string;
  content: string;
  createdAt: string;
  optimistic?: boolean;
}

interface Props {
  threadId: number;
  threadName: string;
  threadType: "CLASS" | "DIRECT";
  role: string;
  userId: string;
  userName: string;
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

export default function MessageArea({
  threadId, threadName, threadType, role, userId, userName, canSend, onMessageSent,
}: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const topSentinelRef = useRef<HTMLDivElement>(null);
  const latestIdRef = useRef<number | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  // ref so the intersection observer always gets the latest loadEarlier without re-subscribing
  const loadEarlierRef = useRef<() => Promise<void>>(() => Promise.resolve());

  // Update latestId whenever real (non-optimistic) messages change
  useEffect(() => {
    const real = messages.filter((m) => m.id > 0);
    if (real.length > 0) latestIdRef.current = real[real.length - 1].id;
  }, [messages]);

  const isNearBottom = useCallback(() => {
    const el = containerRef.current;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight < 150;
  }, []);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    bottomRef.current?.scrollIntoView({ behavior });
  }, []);

  const markRead = useCallback(() => {
    fetch(`/api/chat/threads/${threadId}/read`, { method: "PATCH" });
  }, [threadId]);

  // Initial load
  const fetchInitial = useCallback(async () => {
    const res = await fetch(`/api/chat/threads/${threadId}/messages`);
    if (!res.ok) return;
    const data = await res.json();
    setMessages(data.messages);
    setHasMore(data.hasMore);
    requestAnimationFrame(() => scrollToBottom("instant" as ScrollBehavior));
  }, [threadId, scrollToBottom]);

  // Poll for new messages
  const poll = useCallback(async () => {
    const latestId = latestIdRef.current;
    if (latestId === null) return;
    const res = await fetch(`/api/chat/threads/${threadId}/messages?after=${latestId}`);
    if (!res.ok) return;
    const data = await res.json();
    if (data.messages.length === 0) return;

    const atBottom = isNearBottom();
    setMessages((prev) => {
      // Deduplicate: skip messages whose IDs already exist (e.g. just-confirmed optimistic)
      const existingIds = new Set(prev.map((m) => m.id));
      const incoming = data.messages.filter((m: Message) => !existingIds.has(m.id));
      return incoming.length > 0 ? [...prev, ...incoming] : prev;
    });
    if (atBottom) requestAnimationFrame(() => scrollToBottom("smooth"));
    markRead();
  }, [threadId, isNearBottom, scrollToBottom, markRead]);

  // Load earlier with scroll-position preservation
  const loadEarlier = useCallback(async () => {
    if (!hasMore || loadingMore) return;
    const realMessages = messages.filter((m) => m.id > 0);
    if (realMessages.length === 0) return;

    setLoadingMore(true);
    const container = containerRef.current;
    const prevScrollHeight = container?.scrollHeight ?? 0;
    const oldestId = realMessages[0].id;

    const res = await fetch(`/api/chat/threads/${threadId}/messages?cursor=${oldestId}`);
    if (res.ok) {
      const data = await res.json();
      if (data.messages.length > 0) {
        setMessages((prev) => [...data.messages, ...prev]);
        setHasMore(data.hasMore);
        requestAnimationFrame(() => {
          if (container) {
            container.scrollTop = container.scrollHeight - prevScrollHeight;
          }
        });
      } else {
        setHasMore(false);
      }
    }
    setLoadingMore(false);
  }, [hasMore, loadingMore, messages, threadId]);

  // Keep the ref current
  useEffect(() => {
    loadEarlierRef.current = loadEarlier;
  }, [loadEarlier]);

  // Intersection observer: auto-load when top sentinel enters view
  useEffect(() => {
    const sentinel = topSentinelRef.current;
    const container = containerRef.current;
    if (!sentinel || !container || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadEarlierRef.current();
      },
      { root: container, threshold: 0.1 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore]); // re-wire when hasMore changes

  // Reset on thread switch
  useEffect(() => {
    setMessages([]);
    setHasMore(false);
    latestIdRef.current = null;
    fetchInitial().then(markRead);
  }, [threadId, fetchInitial, markRead]);

  // Poll every 6 s
  useEffect(() => {
    const id = setInterval(poll, 6000);
    return () => clearInterval(id);
  }, [poll]);

  const send = async () => {
    if (!input.trim() || sending) return;
    setSending(true);
    const content = input.trim();
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";

    // Optimistic: show immediately with a temp negative ID
    const tempId = -(Date.now());
    const optimistic: Message = {
      id: tempId,
      senderId: userId,
      senderName: userName,
      content,
      createdAt: new Date().toISOString(),
      optimistic: true,
    };
    setMessages((prev) => [...prev, optimistic]);
    requestAnimationFrame(() => scrollToBottom("smooth"));

    const res = await fetch(`/api/chat/threads/${threadId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });

    if (res.ok) {
      const msg: Message = await res.json();
      // Swap optimistic for the real record
      setMessages((prev) => prev.map((m) => (m.id === tempId ? msg : m)));
      onMessageSent();
      markRead();
    } else {
      // Roll back
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setInput(content);
    }
    setSending(false);
    textareaRef.current?.focus();
  };

  // Group messages by calendar day for date headers
  const groups: { date: string; messages: Message[] }[] = [];
  for (const msg of messages) {
    const dateKey = new Date(msg.createdAt).toDateString();
    const last = groups[groups.length - 1];
    if (last && last.date === dateKey) last.messages.push(msg);
    else groups.push({ date: dateKey, messages: [msg] });
  }

  return (
    <div className="flex-1 flex flex-col min-w-0">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 flex items-center gap-3 flex-shrink-0">
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
      <div ref={containerRef} className="flex-1 overflow-y-auto px-4 py-3">
        {/* Top sentinel — triggers auto-load when scrolled into view */}
        <div ref={topSentinelRef} className="h-1" />

        {hasMore && (
          <button
            onClick={loadEarlier}
            disabled={loadingMore}
            className="w-full text-center text-xs text-orange-500 hover:text-orange-600 py-2 disabled:opacity-50"
          >
            {loadingMore ? "Loading…" : "↑ Load earlier messages"}
          </button>
        )}

        {messages.length === 0 && (
          <p className="text-center text-gray-400 text-sm mt-16">
            No messages yet. Say hello!
          </p>
        )}

        {groups.map((group) => (
          <div key={group.date}>
            {/* Date separator */}
            <div className="flex items-center gap-2 my-3">
              <div className="flex-1 h-px bg-gray-100" />
              <span className="text-xs text-gray-400 flex-shrink-0">
                {formatDateHeader(group.messages[0].createdAt)}
              </span>
              <div className="flex-1 h-px bg-gray-100" />
            </div>

            {group.messages.map((msg, idx) => {
              const isOwn = msg.senderId === userId;
              const prev = idx > 0 ? group.messages[idx - 1] : null;
              const showSender = !isOwn && (!prev || prev.senderId !== msg.senderId);
              const gap = showSender || (prev && prev.senderId !== msg.senderId) ? "mt-2" : "mt-0.5";

              return (
                <div key={msg.id} className={`flex ${isOwn ? "justify-end" : "justify-start"} ${gap}`}>
                  <div className={`max-w-[72%] flex flex-col ${isOwn ? "items-end" : "items-start"}`}>
                    {showSender && (
                      <span className="text-xs text-gray-500 mb-1 px-1">{msg.senderName}</span>
                    )}
                    <div
                      className={`px-3 py-2 rounded-2xl text-sm leading-relaxed break-words ${
                        msg.optimistic
                          ? "bg-orange-300 text-white rounded-br-sm opacity-70"
                          : isOwn
                          ? "bg-orange-500 text-white rounded-br-sm"
                          : "bg-gray-100 text-gray-800 rounded-bl-sm"
                      }`}
                    >
                      {msg.content}
                    </div>
                    <span className="text-[10px] text-gray-400 mt-0.5 px-1">
                      {msg.optimistic ? "Sending…" : formatTime(msg.createdAt)}
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
        <div className="px-4 py-3 border-t border-gray-200 flex items-end gap-2 flex-shrink-0">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              e.target.style.height = "auto";
              e.target.style.height = `${Math.min(e.target.scrollHeight, 128)}px`;
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="Message… (Enter to send, Shift+Enter for new line)"
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
        <div className="px-4 py-3 border-t border-gray-200 text-center text-xs text-gray-400 flex-shrink-0">
          You are viewing this conversation as a moderator
        </div>
      )}
    </div>
  );
}
