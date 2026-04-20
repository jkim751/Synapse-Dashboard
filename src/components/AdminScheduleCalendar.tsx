"use client";

import { useState, useEffect, useCallback } from "react";
import BigCalendar from "./BigCalender";
import AddEventModal from "./AddEventModal";
import DateTimeInput from "./ui/DateTimeInput";
import { toSydneyString, toSydneyDatetimeLocal, sydneyLocalToUTC } from "@/lib/dateUtils";
import { RRule } from "rrule";

const DAYS = [
  { label: "Mon", value: "MO" },
  { label: "Tue", value: "TU" },
  { label: "Wed", value: "WE" },
  { label: "Thu", value: "TH" },
  { label: "Fri", value: "FR" },
  { label: "Sat", value: "SA" },
  { label: "Sun", value: "SU" },
];

function pastelColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) & 0xffff;
  }
  const hue = hash % 360;
  return `hsl(${hue}, 55%, 72%)`;
}

type ScheduleRecord = {
  id: string;
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  type: string;
  rrule?: string | null;
};


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

    // Convert template start to Sydney local to get the correct day/time anchor.
    // Using Sydney local (no Z = floating) means BYDAY days are interpreted in
    // Sydney time rather than UTC, avoiding the day-shift bug.
    const sydneyStr = toSydneyString(templateStart); // "YYYY-MM-DDTHH:MM:SS"
    const sydneyYear = sydneyStr.slice(0, 4);
    const sydneyMonth = sydneyStr.slice(5, 7);
    const sydneyDay = sydneyStr.slice(8, 10);
    const sydneyH = parseInt(sydneyStr.slice(11, 13));
    const sydneyM = parseInt(sydneyStr.slice(14, 16));

    if (!s.rrule) {
      events.push({
        title: s.title,
        start: toSydneyString(templateStart),
        end: toSydneyString(templateEnd),
        description: s.description,
        type: "event" as const,
        scheduleId: s.id,
        color: s.type === "event" ? "#fed7aa" : pastelColor(s.id),
      });
      continue;
    }

    try {
      // No Z suffix = floating time; BYDAY days align with Sydney local calendar
      const dtstart = `${sydneyYear}${sydneyMonth}${sydneyDay}T${pad(sydneyH)}${pad(sydneyM)}00`;
      const rule = RRule.fromString(`DTSTART:${dtstart}\n${s.rrule}`);
      const occurrences = rule.between(windowStart, windowEnd, true);

      for (const occ of occurrences) {
        // In floating mode, occ's UTC getters hold the Sydney local date values
        const occDateStr = `${occ.getUTCFullYear()}-${pad(occ.getUTCMonth() + 1)}-${pad(occ.getUTCDate())}T${pad(sydneyH)}:${pad(sydneyM)}`;
        const start = new Date(sydneyLocalToUTC(occDateStr));
        const end = new Date(start.getTime() + durationMs);
        events.push({
          title: s.title,
          start: toSydneyString(start),
          end: toSydneyString(end),
          description: s.description,
          type: "event" as const,
          scheduleId: s.id,
          color: s.type === "event" ? "#fed7aa" : pastelColor(s.id),
        });
      }
    } catch {
      events.push({
        title: s.title,
        start: toSydneyString(templateStart),
        end: toSydneyString(templateEnd),
        description: s.description,
        type: "event" as const,
        scheduleId: s.id,
        color: s.type === "event" ? "#fed7aa" : pastelColor(s.id),
      });
    }
  }

  return events;
}

function buildRRule(freq: "WEEKLY" | "DAILY", days: string[], until: string): string {
  const parts: string[] = [`FREQ=${freq}`];
  if (freq === "WEEKLY" && days.length > 0) {
    parts.push(`BYDAY=${days.join(",")}`);
  }
  if (until) {
    const d = new Date(until + "T23:59:59Z");
    if (!isNaN(d.getTime())) {
      const pad = (n: number) => String(n).padStart(2, "0");
      parts.push(`UNTIL=${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T235959Z`);
    }
  }
  return `RRULE:${parts.join(";")}`;
}

function parseRRule(rrule: string | null | undefined): {
  recurring: boolean;
  freq: "WEEKLY" | "DAILY";
  days: string[];
  until: string;
} {
  if (!rrule) return { recurring: false, freq: "WEEKLY", days: [], until: "" };

  const freqMatch = rrule.match(/FREQ=(WEEKLY|DAILY)/);
  const freq = (freqMatch?.[1] ?? "WEEKLY") as "WEEKLY" | "DAILY";

  const bydayMatch = rrule.match(/BYDAY=([^;]+)/);
  const days = bydayMatch ? bydayMatch[1].split(",") : [];

  const untilMatch = rrule.match(/UNTIL=(\d{8})/);
  const until = untilMatch
    ? `${untilMatch[1].slice(0, 4)}-${untilMatch[1].slice(4, 6)}-${untilMatch[1].slice(6, 8)}`
    : "";

  return { recurring: true, freq, days, until };
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

  // Recurrence edit state
  const [editRecurring, setEditRecurring] = useState(false);
  const [editFreq, setEditFreq] = useState<"WEEKLY" | "DAILY">("WEEKLY");
  const [editDays, setEditDays] = useState<string[]>([]);
  const [editUntil, setEditUntil] = useState("");

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

    const parsed = parseRRule(schedule.rrule);
    setEditRecurring(parsed.recurring);
    setEditFreq(parsed.freq);
    setEditDays(parsed.days);
    setEditUntil(parsed.until);
  };

  const closeEdit = () => {
    setEditingSchedule(null);
    setDeleteConfirming(false);
    setEditError(null);
  };

  const toggleEditDay = (day: string) => {
    setEditDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
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
    if (editType === "shift" && editRecurring) {
      if (editFreq === "WEEKLY" && editDays.length === 0) {
        setEditError("Select at least one day for weekly recurrence");
        return;
      }
      if (!editUntil) {
        setEditError("An end date is required for recurring shifts");
        return;
      }
    }

    setEditSubmitting(true);
    setEditError(null);

    const rrule =
      editType === "shift" && editRecurring
        ? buildRRule(editFreq, editDays, editUntil)
        : null;

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
          rrule,
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
                  onClick={() => {
                    setEditType(t);
                    if (t !== "shift") setEditRecurring(false);
                  }}
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {editType === "shift" && editRecurring ? "First occurrence" : "Start"}
                  </label>
                  <DateTimeInput value={editStart} onChange={setEditStart} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End</label>
                  <DateTimeInput value={editEnd} onChange={setEditEnd} />
                </div>
              </div>

              {/* Recurrence — shifts only */}
              {editType === "shift" && (
                <div className="border border-gray-200 rounded-xl p-4 space-y-4">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={editRecurring}
                      onChange={(e) => setEditRecurring(e.target.checked)}
                      className="w-4 h-4 accent-orange-500"
                    />
                    <span className="text-sm font-medium text-gray-700">Repeating shift</span>
                  </label>

                  {editRecurring && (
                    <div className="space-y-4">
                      {/* Frequency */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Repeats</label>
                        <div className="flex bg-gray-100 rounded-xl p-1">
                          {(["WEEKLY", "DAILY"] as const).map((f) => (
                            <button
                              key={f}
                              type="button"
                              onClick={() => {
                                setEditFreq(f);
                                if (f === "DAILY") setEditDays([]);
                              }}
                              className={`flex-1 py-1.5 text-sm font-medium rounded-xl transition-colors ${
                                editFreq === f
                                  ? "bg-white text-gray-900 shadow-sm"
                                  : "text-gray-500 hover:text-gray-700"
                              }`}
                            >
                              {f === "WEEKLY" ? "Weekly" : "Daily"}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Days of week */}
                      {editFreq === "WEEKLY" && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">On these days</label>
                          <div className="flex gap-1.5 flex-wrap">
                            {DAYS.map(({ label, value }) => (
                              <button
                                key={value}
                                type="button"
                                onClick={() => toggleEditDay(value)}
                                className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                                  editDays.includes(value)
                                    ? "bg-orange-500 text-white border-orange-500"
                                    : "bg-white text-gray-600 border-gray-300 hover:border-orange-400"
                                }`}
                              >
                                {label}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Until */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Repeat until</label>
                        <input
                          type="date"
                          value={editUntil}
                          onChange={(e) => setEditUntil(e.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

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
