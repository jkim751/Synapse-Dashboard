"use client";

import { useState, useTransition } from "react";
import { createMakeupLesson } from "@/lib/actions";

interface Student {
  id: string;
  name: string;
  surname: string;
}

interface Subject {
  id: number;
  name: string;
}

interface Teacher {
  id: string;
  name: string;
  surname: string;
}

interface CreateMakeupModalProps {
  classId: number;
  students: Student[];
  subjects: Subject[];
  teachers: Teacher[];
  defaultDate: string; // "YYYY-MM-DD"
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateMakeupModal({
  classId,
  students,
  subjects,
  teachers,
  defaultDate,
  onClose,
  onSuccess,
}: CreateMakeupModalProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [sendEmailNotif, setSendEmailNotif] = useState(false);

  const toggleStudent = (id: string) => {
    setSelectedStudents(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelectedStudents(new Set(students.map(s => s.id)));
  const clearAll = () => setSelectedStudents(new Set());

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (selectedStudents.size === 0) {
      setError("Please select at least one student.");
      return;
    }

    const form = e.currentTarget;
    const data = new FormData(form);

    const subjectId = Number(data.get("subjectId"));
    const teacherId = data.get("teacherId") as string;
    const startTime = data.get("startTime") as string;
    const endTime = data.get("endTime") as string;

    if (!subjectId || !teacherId || !startTime || !endTime) {
      setError("Please fill in all fields.");
      return;
    }

    const subjectName = subjects.find(s => s.id === subjectId)?.name ?? "Makeup";

    startTransition(async () => {
      const result = await createMakeupLesson({
        name: `${subjectName} (Makeup)`,
        subjectId,
        classId,
        teacherId,
        startTime,
        endTime,
        studentIds: Array.from(selectedStudents),
      });

      if (result.success) {
        if (sendEmailNotif && result.lessonId) {
          await fetch('/api/lessons/email-notify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: 'makeup', lessonId: result.lessonId }),
          });
        }
        onSuccess();
      } else {
        setError(result.message ?? "Failed to create makeup lesson.");
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 p-6 overflow-y-auto max-h-[90vh]">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Create Makeup Class</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl font-bold">×</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Subject */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
            <select name="subjectId" required className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300">
              <option value="">Select subject…</option>
              {subjects.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          {/* Teacher */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Teacher</label>
            <select name="teacherId" required className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300">
              <option value="">Select teacher…</option>
              {teachers.map(t => (
                <option key={t.id} value={t.id}>{t.name} {t.surname}</option>
              ))}
            </select>
          </div>

          {/* Date / Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start</label>
              <input
                type="datetime-local"
                name="startTime"
                defaultValue={`${defaultDate}T09:00`}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End</label>
              <input
                type="datetime-local"
                name="endTime"
                defaultValue={`${defaultDate}T10:00`}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
              />
            </div>
          </div>

          {/* Student selection */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-gray-700">
                Students ({selectedStudents.size} selected)
              </label>
              <div className="flex gap-2 text-xs">
                <button type="button" onClick={selectAll} className="text-orange-500 hover:underline">All</button>
                <button type="button" onClick={clearAll} className="text-gray-400 hover:underline">Clear</button>
              </div>
            </div>
            <div className="border border-gray-200 rounded-lg max-h-48 overflow-y-auto divide-y divide-gray-100">
              {students.map(s => (
                <label key={s.id} className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedStudents.has(s.id)}
                    onChange={() => toggleStudent(s.id)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">{s.name} {s.surname}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Email notification */}
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={sendEmailNotif}
              onChange={e => setSendEmailNotif(e.target.checked)}
              className="w-4 h-4"
            />
            <span className="text-sm text-gray-700">Notify students &amp; parents by email</span>
          </label>
              
          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm rounded-lg border border-gray-300 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-4 py-2 text-sm rounded-lg bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-50"
            >
              {isPending ? "Creating…" : "Create Makeup Class"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
