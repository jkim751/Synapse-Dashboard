"use client";

import { useState, useEffect, useCallback } from "react";
import BigCalendar from "./BigCalender";
import AddEventModal from "./AddEventModal";
import DateTimeInput from "./ui/DateTimeInput";
import { toSydneyString, toSydneyDatetimeLocal, sydneyLocalToUTC } from "@/lib/dateUtils";
import { RRule } from "rrule";

type ScheduleRecord = {
  id: string;
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  type: string;
  rrule?: string | null;
};

function pastelColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) & 0xffff;
  }
  const hue = hash % 360;
  return `hsl(${hue}, 55%, 72%)`;
}

function expandSchedules(schedules: ScheduleRecord[]): any[] {
  const now = new Date();
  const windowStart = new Date(now);
  windowStart.setMonth(windowStart.getMonth() - 6);
  const windowEnd = new Date(now);
  windowEnd.setMonth(windowEnd.getMonth() + 6);

  const pad = (n: number) => String(n).padStart(2, "0");
  const events: any[] = [];

  for (const s of schedules) {
    const templateStart = new Date(s.startTime);
    const templateEnd = new Date(s.endTime);
    const durationMs = templateEnd.getTime() - templateStart.getTime();
    const templateH = templateStart.getUTCHours();
    const templateM = templateStart.getUTCMinutes();

    if (!s.rrule) {
      events.push({
        title: s.title,
        start: toSydneyString(templateStart),
        end: toSydneyString(templateEnd),
        description: s.description,
        type: "event" as const,
        scheduleId: s.id,
        color: pastelColor(s.id),
      });
      continue;
    }

    try {
      const dtstart = `${templateStart.getUTCFullYear()}${pad(templateStart.getUTCMonth() + 1)}${pad(templateStart.getUTCDate())}T${pad(templateH)}${pad(templateM)}00Z`;
      const rule = RRule.fromString(`DTSTART:${dtstart}\n${s.rrule}`);
      const occurrences = rule.between(windowStart, windowEnd, true);

      for (const occ of occurrences) {
        const start = new Date(Date.UTC(occ.getFullYear(), occ.getMonth(), occ.getDate(), templateH, templateM));
        const end = new Date(start.getTime() + durationMs);
        events.push({
          title: s.title,
          start: toSydneyString(start),
          end: toSydneyString(end),
          description: s.description,
          type: "event" as const,
          scheduleId: s.id,
          color: pastelColor(s.id),
        });
      }
    } catch {
      // Fallback: show just the first occurrence
      events.push({
        title: s.title,
        start: toSydneyString(templateStart),
        end: toSydneyString(templateEnd),
        description: s.description,
        type: "event" as const,
        scheduleId: s.id,
        color: pastelColor(s.id),
      });
    }
  }

  return events;
}

export default function AdminScheduleCalendar() {
  const [schedules, setSchedules] = useState<ScheduleRecord[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<any[]>([]);
  const [editingSchedule, setEditingSchedule] = useState<ScheduleRecord | null>(null);

  // Edit form state
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editType, setEditType] = useState<"event" | "shift">("event");
  const [editStart, setEditStart] = useState("");
  const [editEnd, setEditEnd] = useState("");
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [deleteConfirming, setDeleteConfirming] = useState(false);

  const fetchSchedules = useCallback(async () => {
    const res = await fetch("/api/events");
    if (!res.ok) return;
    const data: ScheduleRecord[] = await res.json();
    setSchedules(data);
    setCalendarEvents(expandSchedules(data));
  }, []);

  useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules]);

  const openEdit = (calendarEvent: any) => {
    const schedule = schedules.find((s) => s.id === calendarEvent.scheduleId);
    if (!schedule) return;
    setEditingSchedule(schedule);
    setEditTitle(schedule.title);
    setEditDescription(schedule.description);
    setEditType(schedule.type === "shift" ? "shift" : "event");
    setEditStart(toSydneyDatetimeLocal(schedule.startTime));
    setEditEnd(toSydneyDatetimeLocal(schedule.endTime));
    setEditError(null);
    setDeleteConfirming(false);
  };

  const closeEdit = () => {
    setEditingSchedule(null);
    setDeleteConfirming(false);
    setEditError(null);
  };

  const handleUpdate = async () => {
    if (!editingSchedule) return;
    if (!editTitle.trim() || !editDescription.trim() || !editStart || !editEnd) {
      setEditError("All fields are required");
      return;
    }
    if (new Date(editEnd) <= new Date(editStart)) {
      setEditError("End time must be after start time");
      return;
    }
    setEditSubmitting(true);
    setEditError(null);
    try {
      const res = await fetch(`/api/events/${editingSchedule.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editTitle.trim(),
          description: editDescription.trim(),
          startTime: sydneyLocalToUTC(editStart),
          endTime: sydneyLocalToUTC(editEnd),
          type: editType,
        }),
      });
      if (!res.ok) {
        const json = await res.json();
        setEditError(json.error ?? "Failed to update");
        return;
      }
      closeEdit();
      fetchSchedules();
    } catch {
      setEditError("An unexpected error occurred");
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!editingSchedule) return;
    setEditSubmitting(true);
    try {
      await fetch(`/api/events/${editingSchedule.id}`, { method: "DELETE" });
      closeEdit();
      fetchSchedules();
    } catch {
      setEditError("Failed to delete");
    } finally {
      setEditSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col h-full gap-3">
      <div className="flex justify-end">
        <AddEventModal onSuccess={fetchSchedules} />
      </div>
      <div className="flex-1 overflow-hidden">
        <BigCalendar
          initialLessons={[]}
          initialEvents={calendarEvents}
          showNotifications={false}
          canDragDrop={false}
          onEventClick={openEdit}
        />
      </div>

      {/* Edit modal */}
      {editingSchedule && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-lg font-semibold text-gray-800">Edit {editType === "shift" ? "Shift" : "Event"}</h2>
              <button onClick={closeEdit} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
            </div>

            {/* Type toggle */}
            <div className="flex bg-gray-100 rounded-xl p-1 mb-5">
              {(["event", "shift"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setEditType(t)}
                  className={`flex-1 py-1.5 text-sm font-medium rounded-xl transition-colors ${
                    editType === t ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {t === "event" ? "Event" : "Shift / Schedule"}
                </button>
              ))}
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {editType === "shift" ? "Shift name" : "Title"}
                </label>
                <input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {editType === "shift" ? "Notes" : "Description"}
                </label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={2}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start</label>
                  <DateTimeInput value={editStart} onChange={setEditStart} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End</label>
                  <DateTimeInput value={editEnd} onChange={setEditEnd} />
                </div>
              </div>

              {editError && <p className="text-red-500 text-sm">{editError}</p>}

              <div className="flex items-center justify-between pt-2">
                {/* Delete side */}
                {deleteConfirming ? (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-red-600">Are you sure?</span>
                    <button
                      onClick={handleDelete}
                      disabled={editSubmitting}
                      className="px-3 py-1.5 text-xs bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors disabled:opacity-60"
                    >
                      Yes, delete
                    </button>
                    <button
                      onClick={() => setDeleteConfirming(false)}
                      className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg text-gray-600 hover:text-gray-800"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setDeleteConfirming(true)}
                    className="text-sm text-red-400 hover:text-red-600 transition-colors"
                  >
                    Delete
                  </button>
                )}

                {/* Save/cancel side */}
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={closeEdit}
                    className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleUpdate}
                    disabled={editSubmitting}
                    className="px-4 py-2 text-sm bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors disabled:opacity-60 flex items-center gap-2"
                  >
                    {editSubmitting && (
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    )}
                    {editSubmitting ? "Saving..." : "Save changes"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
