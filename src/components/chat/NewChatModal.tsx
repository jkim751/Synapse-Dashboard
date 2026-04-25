"use client";

import { useState, useEffect } from "react";

interface ClassOption {
  id: number;
  name: string;
  students: { student: { id: string; name: string; surname: string } }[];
}

interface PersonOption {
  id: string;
  name: string;
  surname: string;
  role: string;
}

interface Props {
  role: string;
  onClose: () => void;
  onCreated: (threadId: number) => void;
}

export default function NewChatModal({ role, onClose, onCreated }: Props) {
  const isTeacher = role === "teacher" || role === "teacher-admin";
  const [chatType, setChatType] = useState<"group" | "direct">(isTeacher ? "group" : "direct");
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [teachers, setTeachers] = useState<PersonOption[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [selectedPersonId, setSelectedPersonId] = useState("");
  const [selectedPersonName, setSelectedPersonName] = useState("");
  const [selectedPersonRole, setSelectedPersonRole] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/chat/people")
      .then((r) => r.json())
      .then((data) => {
        setClasses(data.classes || []);
        setTeachers(data.teachers || []);
      })
      .finally(() => setFetching(false));
  }, []);

  const allStudents: PersonOption[] = isTeacher
    ? (selectedClassId
        ? (classes.find((c) => c.id === selectedClassId)?.students ?? [])
        : classes.flatMap((c) => c.students)
      ).map((s) => ({ ...s.student, role: "student" }))
    : [];

  // Deduplicate students (a student can appear in multiple classes)
  const uniqueStudents = Array.from(new Map(allStudents.map((s) => [s.id, s])).values());

  const handleSubmit = async () => {
    setError("");
    setLoading(true);
    try {
      if (chatType === "group") {
        if (!selectedClassId) { setError("Please select a class"); return; }
        const res = await fetch("/api/chat/threads", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ classId: selectedClassId }),
        });
        const data = await res.json();
        if (!res.ok) { setError(data.error || "Failed to create chat"); return; }
        onCreated(data.id);
      } else {
        if (!selectedPersonId) { setError("Please select a person"); return; }
        const res = await fetch("/api/chat/threads/direct", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            targetUserId: selectedPersonId,
            targetRole: selectedPersonRole,
            targetName: selectedPersonName,
          }),
        });
        const data = await res.json();
        if (!res.ok) { setError(data.error || "Failed to create chat"); return; }
        onCreated(data.id);
      }
    } finally {
      setLoading(false);
    }
  };

  const selectPerson = (id: string, people: PersonOption[]) => {
    const p = people.find((x) => x.id === id);
    setSelectedPersonId(id);
    setSelectedPersonName(p ? `${p.name} ${p.surname}` : "");
    setSelectedPersonRole(p?.role || "");
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-gray-800">New Chat</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">✕</button>
        </div>

        {/* Type toggle — teachers only */}
        {isTeacher && (
          <div className="flex gap-2 mb-5 p-1 bg-gray-100 rounded-lg">
            {(["group", "direct"] as const).map((t) => (
              <button
                key={t}
                onClick={() => { setChatType(t); setSelectedPersonId(""); setSelectedPersonName(""); }}
                className={`flex-1 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  chatType === t ? "bg-white text-gray-800 shadow-sm" : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {t === "group" ? "Group Chat" : "Direct Message"}
              </button>
            ))}
          </div>
        )}

        {fetching ? (
          <p className="text-sm text-gray-400 text-center py-4">Loading…</p>
        ) : (
          <>
            {/* Group: class picker */}
            {chatType === "group" && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Class</label>
                <select
                  value={selectedClassId ?? ""}
                  onChange={(e) => setSelectedClassId(e.target.value ? Number(e.target.value) : null)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                >
                  <option value="">Choose a class…</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                {selectedClassId && (
                  <p className="text-xs text-gray-400 mt-1.5">
                    A group chat will be created and all students in this class will be auto-added.
                    If a chat already exists for this class, you will be taken to it.
                  </p>
                )}
              </div>
            )}

            {/* Teacher → direct with student */}
            {chatType === "direct" && isTeacher && (
              <>
                <div className="mb-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Filter by class</label>
                  <select
                    value={selectedClassId ?? ""}
                    onChange={(e) => { setSelectedClassId(e.target.value ? Number(e.target.value) : null); setSelectedPersonId(""); }}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                  >
                    <option value="">All classes</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Student</label>
                  <select
                    value={selectedPersonId}
                    onChange={(e) => selectPerson(e.target.value, uniqueStudents)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                  >
                    <option value="">Choose a student…</option>
                    {uniqueStudents.map((s) => (
                      <option key={s.id} value={s.id}>{s.name} {s.surname}</option>
                    ))}
                  </select>
                </div>
              </>
            )}

            {/* Student → direct with teacher */}
            {chatType === "direct" && !isTeacher && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Teacher</label>
                <select
                  value={selectedPersonId}
                  onChange={(e) => selectPerson(e.target.value, teachers)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                >
                  <option value="">Choose a teacher…</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>{t.name} {t.surname}</option>
                  ))}
                </select>
              </div>
            )}
          </>
        )}

        {error && <p className="text-red-500 text-sm mb-3">{error}</p>}

        <div className="flex gap-2 justify-end mt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || fetching}
            className="px-4 py-2 text-sm bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 transition-colors"
          >
            {loading ? "Creating…" : "Start Chat"}
          </button>
        </div>
      </div>
    </div>
  );
}
