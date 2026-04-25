"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface Message {
  id: number;
  senderId: string;
  senderName: string;
  content: string;
  attachments: string[];
  createdAt: string;
  optimistic?: boolean;
}

interface PendingFile {
  file: File;
  preview: string | null; // object URL for images, null for docs
  isImage: boolean;
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

const ALLOWED_TYPES = new Set([
  "image/jpeg", "image/png", "image/gif", "image/webp",
  "application/pdf", "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
]);
const MAX_SIZE = 10 * 1024 * 1024;
const MAX_FILES = 5;

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

function isImageUrl(url: string): boolean {
  return /\.(jpg|jpeg|png|gif|webp)(\?|$)/i.test(url);
}

function filenameFromUrl(url: string): string {
  const raw = url.split("?")[0].split("/").pop() ?? "file";
  return raw.replace(/^\d+-/, "");
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

function AttachmentDisplay({ urls, isOwn }: { urls: string[]; isOwn: boolean }) {
  if (!urls || urls.length === 0) return null;
  return (
    <div className="flex flex-col gap-1 mt-1">
      {urls.map((url, i) =>
        isImageUrl(url) ? (
          <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="block">
            <img
              src={url}
              alt="attachment"
              className="max-w-full max-h-56 rounded-xl object-contain border border-white/20 cursor-zoom-in"
            />
          </a>
        ) : (
          <a
            key={i}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className={`flex items-center gap-2 text-xs rounded-lg px-2 py-1.5 ${
              isOwn ? "bg-orange-400/40 text-white" : "bg-gray-200 text-gray-700"
            }`}
          >
            <span className="text-base">📄</span>
            <span className="truncate max-w-[180px]">{filenameFromUrl(url)}</span>
          </a>
        )
      )}
    </div>
  );
}

export default function MessageArea({
  threadId, threadName, threadType, role, userId, userName, canSend, onMessageSent,
}: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [fileError, setFileError] = useState("");

  const containerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const topSentinelRef = useRef<HTMLDivElement>(null);
  const latestIdRef = useRef<number | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const loadEarlierRef = useRef<() => Promise<void>>(() => Promise.resolve());
  // Track all created object URLs for cleanup on unmount
  const objectUrls = useRef<string[]>([]);

  useEffect(() => () => objectUrls.current.forEach(URL.revokeObjectURL), []);

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

  const fetchInitial = useCallback(async () => {
    const res = await fetch(`/api/chat/threads/${threadId}/messages`);
    if (!res.ok) return;
    const data = await res.json();
    setMessages(data.messages);
    setHasMore(data.hasMore);
    requestAnimationFrame(() => scrollToBottom("instant" as ScrollBehavior));
  }, [threadId, scrollToBottom]);

  const poll = useCallback(async () => {
    const latestId = latestIdRef.current;
    if (latestId === null) return;
    const res = await fetch(`/api/chat/threads/${threadId}/messages?after=${latestId}`);
    if (!res.ok) return;
    const data = await res.json();
    if (data.messages.length === 0) return;
    const atBottom = isNearBottom();
    setMessages((prev) => {
      const ids = new Set(prev.map((m) => m.id));
      const incoming = data.messages.filter((m: Message) => !ids.has(m.id));
      return incoming.length > 0 ? [...prev, ...incoming] : prev;
    });
    if (atBottom) requestAnimationFrame(() => scrollToBottom("smooth"));
    markRead();
  }, [threadId, isNearBottom, scrollToBottom, markRead]);

  const loadEarlier = useCallback(async () => {
    if (!hasMore || loadingMore) return;
    const real = messages.filter((m) => m.id > 0);
    if (real.length === 0) return;
    setLoadingMore(true);
    const container = containerRef.current;
    const prevH = container?.scrollHeight ?? 0;
    const res = await fetch(`/api/chat/threads/${threadId}/messages?cursor=${real[0].id}`);
    if (res.ok) {
      const data = await res.json();
      if (data.messages.length > 0) {
        setMessages((prev) => [...data.messages, ...prev]);
        setHasMore(data.hasMore);
        requestAnimationFrame(() => {
          if (container) container.scrollTop = container.scrollHeight - prevH;
        });
      } else {
        setHasMore(false);
      }
    }
    setLoadingMore(false);
  }, [hasMore, loadingMore, messages, threadId]);

  useEffect(() => { loadEarlierRef.current = loadEarlier; }, [loadEarlier]);

  useEffect(() => {
    const sentinel = topSentinelRef.current;
    const container = containerRef.current;
    if (!sentinel || !container || !hasMore) return;
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) loadEarlierRef.current(); },
      { root: container, threshold: 0.1 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore]);

  useEffect(() => {
    setMessages([]);
    setHasMore(false);
    latestIdRef.current = null;
    setPendingFiles([]);
    fetchInitial().then(markRead);
  }, [threadId, fetchInitial, markRead]);

  useEffect(() => {
    const id = setInterval(poll, 6000);
    return () => clearInterval(id);
  }, [poll]);

  // ── File handling ──────────────────────────────────────────────────────────

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileError("");
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";

    if (pendingFiles.length + files.length > MAX_FILES) {
      setFileError(`Maximum ${MAX_FILES} files per message`);
      return;
    }

    const newItems: PendingFile[] = [];
    for (const file of files) {
      if (file.size > MAX_SIZE) { setFileError(`${file.name} exceeds 10 MB`); continue; }
      if (!ALLOWED_TYPES.has(file.type)) { setFileError(`${file.name} type not supported`); continue; }
      const isImage = file.type.startsWith("image/");
      const preview = isImage ? URL.createObjectURL(file) : null;
      if (preview) objectUrls.current.push(preview);
      newItems.push({ file, preview, isImage });
    }
    setPendingFiles((prev) => [...prev, ...newItems]);
  };

  const removePending = (index: number) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // ── Send ───────────────────────────────────────────────────────────────────

  const send = async () => {
    const text = input.trim();
    if (!text && pendingFiles.length === 0) return;
    if (sending) return;
    setSending(true);

    const filesToUpload = [...pendingFiles];
    setInput("");
    setPendingFiles([]);
    if (textareaRef.current) textareaRef.current.style.height = "auto";

    // Optimistic: use local preview URLs for images, placeholder for docs
    const optimisticAttachments = filesToUpload.map(
      (f) => f.preview ?? `doc:${f.file.name}`
    );
    const tempId = -(Date.now());
    const optimistic: Message = {
      id: tempId,
      senderId: userId,
      senderName: userName,
      content: text,
      attachments: optimisticAttachments,
      createdAt: new Date().toISOString(),
      optimistic: true,
    };
    setMessages((prev) => [...prev, optimistic]);
    requestAnimationFrame(() => scrollToBottom("smooth"));

    // Upload files in parallel
    let uploadedUrls: string[] = [];
    if (filesToUpload.length > 0) {
      const results = await Promise.allSettled(
        filesToUpload.map(async (pf) => {
          const fd = new FormData();
          fd.append("file", pf.file);
          fd.append("threadId", String(threadId));
          const res = await fetch("/api/chat/upload", { method: "POST", body: fd });
          if (!res.ok) throw new Error("Upload failed");
          const data = await res.json();
          return data.url as string;
        })
      );
      uploadedUrls = results
        .filter((r): r is PromiseFulfilledResult<string> => r.status === "fulfilled")
        .map((r) => r.value);
    }

    // POST message
    const res = await fetch(`/api/chat/threads/${threadId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: text, attachments: uploadedUrls }),
    });

    if (res.ok) {
      const msg: Message = await res.json();
      setMessages((prev) => prev.map((m) => (m.id === tempId ? msg : m)));
      onMessageSent();
      markRead();
    } else {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setInput(text);
      setPendingFiles(filesToUpload);
      setFileError("Failed to send. Please try again.");
    }
    setSending(false);
    textareaRef.current?.focus();
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  const groups: { date: string; messages: Message[] }[] = [];
  for (const msg of messages) {
    const key = new Date(msg.createdAt).toDateString();
    const last = groups[groups.length - 1];
    if (last && last.date === key) last.messages.push(msg);
    else groups.push({ date: key, messages: [msg] });
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
          <p className="text-center text-gray-400 text-sm mt-16">No messages yet. Say hello!</p>
        )}
        {groups.map((group) => (
          <div key={group.date}>
            <div className="flex items-center gap-2 my-3">
              <div className="flex-1 h-px bg-gray-100" />
              <span className="text-xs text-gray-400 flex-shrink-0">{formatDateHeader(group.messages[0].createdAt)}</span>
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
                    {/* Bubble — only render if there's text */}
                    {msg.content && (
                      <div className={`px-3 py-2 rounded-2xl text-sm leading-relaxed break-words ${
                        msg.optimistic
                          ? "bg-orange-300 text-white rounded-br-sm opacity-70"
                          : isOwn
                          ? "bg-orange-500 text-white rounded-br-sm"
                          : "bg-gray-100 text-gray-800 rounded-bl-sm"
                      }`}>
                        {msg.content}
                      </div>
                    )}
                    {/* Attachments */}
                    {msg.attachments && msg.attachments.length > 0 && (
                      <div className={`mt-1 flex flex-col gap-1 ${msg.content ? "" : ""}`}>
                        {msg.attachments.map((url, ai) => {
                          // During optimistic, doc placeholders start with "doc:"
                          if (url.startsWith("doc:")) {
                            const fname = url.slice(4);
                            return (
                              <div key={ai} className={`flex items-center gap-2 text-xs rounded-lg px-2 py-1.5 opacity-60 ${
                                isOwn ? "bg-orange-400/40 text-white" : "bg-gray-200 text-gray-700"
                              }`}>
                                <span className="text-base">📄</span>
                                <span className="truncate max-w-[180px]">{fname}</span>
                                <span className="ml-auto">Uploading…</span>
                              </div>
                            );
                          }
                          return isImageUrl(url) ? (
                            <a key={ai} href={url} target="_blank" rel="noopener noreferrer" className="block">
                              <img
                                src={url}
                                alt="attachment"
                                className={`max-w-full max-h-56 rounded-xl object-contain cursor-zoom-in ${
                                  msg.optimistic ? "opacity-60" : ""
                                }`}
                              />
                            </a>
                          ) : (
                            <a
                              key={ai}
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`flex items-center gap-2 text-xs rounded-lg px-2 py-1.5 ${
                                isOwn ? "bg-orange-400/40 text-white" : "bg-gray-200 text-gray-700"
                              }`}
                            >
                              <span className="text-base">📄</span>
                              <span className="truncate max-w-[180px]">{filenameFromUrl(url)}</span>
                            </a>
                          );
                        })}
                      </div>
                    )}
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

      {/* Pending file preview strip */}
      {pendingFiles.length > 0 && (
        <div className="px-4 pt-2 flex flex-wrap gap-2 border-t border-gray-100 flex-shrink-0">
          {pendingFiles.map((pf, i) => (
            <div key={i} className="relative group flex-shrink-0">
              {pf.isImage && pf.preview ? (
                <img
                  src={pf.preview}
                  alt={pf.file.name}
                  className="h-16 w-16 object-cover rounded-lg border border-gray-200"
                />
              ) : (
                <div className="h-16 w-28 flex flex-col items-center justify-center bg-gray-50 rounded-lg border border-gray-200 px-2 text-center">
                  <span className="text-xl">📄</span>
                  <span className="text-[10px] text-gray-500 truncate w-full mt-0.5">{pf.file.name}</span>
                  <span className="text-[10px] text-gray-400">{formatBytes(pf.file.size)}</span>
                </div>
              )}
              <button
                onClick={() => removePending(i)}
                className="absolute -top-1.5 -right-1.5 bg-gray-700 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity leading-none"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {fileError && (
        <p className="px-4 py-1 text-xs text-red-500 flex-shrink-0">{fileError}</p>
      )}

      {/* Input */}
      {canSend ? (
        <div className="px-4 py-3 border-t border-gray-200 flex items-end gap-2 flex-shrink-0">
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/jpeg,image/png,image/gif,image/webp,application/pdf,application/msword,.docx,text/plain"
            className="hidden"
            onChange={handleFileSelect}
          />
          {/* Attachment button */}
          <button
            onClick={() => { setFileError(""); fileInputRef.current?.click(); }}
            disabled={sending || pendingFiles.length >= MAX_FILES}
            className="text-gray-400 hover:text-orange-500 transition-colors disabled:opacity-30 flex-shrink-0 pb-2"
            title="Attach file or photo"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
          </button>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              e.target.style.height = "auto";
              e.target.style.height = `${Math.min(e.target.scrollHeight, 128)}px`;
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
            }}
            placeholder="Message… (Enter to send)"
            className="flex-1 resize-none border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 overflow-hidden"
            rows={1}
          />
          <button
            onClick={send}
            disabled={(!input.trim() && pendingFiles.length === 0) || sending}
            className="bg-orange-500 text-white px-4 py-2 rounded-xl hover:bg-orange-600 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium flex-shrink-0 transition-colors"
          >
            {sending ? "…" : "Send"}
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
