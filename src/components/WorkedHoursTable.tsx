"use client";

import { useState } from "react";

export type HoursEntry = {
  id: string;
  date: string;
  className: string;
  hoursWorked: number;
  attendees: string | null;
  notes: string | null;
};

type Draft = {
  date: string;
  className: string;
  hoursWorked: string;
  attendees: string;
  notes: string;
};

const todayISO = () => new Date().toISOString().slice(0, 10);

const fmt = (iso: string) =>
  new Date(iso).toLocaleDateString("en-AU", { day: "2-digit", month: "short", year: "numeric" });

export default function WorkedHoursTable({
  initialEntries,
  teacherId,
  readOnly = false,
}: {
  initialEntries: HoursEntry[];
  teacherId?: string;
  readOnly?: boolean;
}) {
  const [entries, setEntries] = useState<HoursEntry[]>(initialEntries);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Draft>({ date: "", className: "", hoursWorked: "", attendees: "", notes: "" });
  const [pending, setPending] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const startEdit = (entry: HoursEntry) => {
    setEditingId(entry.id);
    setEditDraft({
      date: entry.date.slice(0, 10),
      className: entry.className,
      hoursWorked: String(entry.hoursWorked),
      attendees: entry.attendees ?? "",
      notes: entry.notes ?? "",
    });
  };

  const saveEdit = async (id: string) => {
    if (!editDraft.className.trim() || !editDraft.hoursWorked) { setEditingId(null); return; }
    setSaving(true);
    try {
      const res = await fetch(`/api/hours/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: editDraft.date,
          className: editDraft.className,
          hoursWorked: parseFloat(editDraft.hoursWorked),
          attendees: editDraft.attendees,
          notes: editDraft.notes,
        }),
      });
      if (res.ok) {
        const updated: HoursEntry = await res.json();
        setEntries((prev) => prev.map((e) => (e.id === id ? updated : e)));
      }
    } finally {
      setSaving(false);
      setEditingId(null);
    }
  };

  const addRow = () => {
    if (pending) return;
    setPending({ date: todayISO(), className: "", hoursWorked: "", attendees: "", notes: "" });
  };

  const savePending = async () => {
    if (!pending || !pending.className.trim() || !pending.hoursWorked) return;
    setSaving(true);
    try {
      const res = await fetch("/api/hours", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: pending.date,
          className: pending.className,
          hoursWorked: parseFloat(pending.hoursWorked),
          attendees: pending.attendees,
          notes: pending.notes,
          teacherId,
        }),
      });
      if (res.ok) {
        const created: HoursEntry = await res.json();
        setEntries((prev) => [created, ...prev]);
        setPending(null);
      }
    } finally {
      setSaving(false);
    }
  };

  const deleteEntry = async (id: string) => {
    setDeleting(id);
    try {
      const res = await fetch(`/api/hours/${id}`, { method: "DELETE" });
      if (res.ok) setEntries((prev) => prev.filter((e) => e.id !== id));
    } finally {
      setDeleting(null);
    }
  };

  const inputCls = "w-full px-2 py-1 border border-orange-300 rounded-lg text-sm focus:outline-none focus:border-orange-400 bg-orange-50";

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b border-gray-100">
              <th className="pb-3 font-medium w-32">Date</th>
              <th className="pb-3 font-medium">Class Name</th>
              <th className="pb-3 font-medium w-28">Hours Worked</th>
              <th className="pb-3 font-medium w-28">Attendees</th>
              <th className="pb-3 font-medium">Notes</th>
              <th className="pb-3 w-10" />
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) =>
              editingId === entry.id ? (
                <tr key={entry.id} className="border-b border-orange-100 bg-orange-50">
                  <td className="py-2 pr-3">
                    <input type="date" value={editDraft.date} onChange={(e) => setEditDraft((d) => ({ ...d, date: e.target.value }))} className={inputCls} />
                  </td>
                  <td className="py-2 pr-3">
                    <input type="text" value={editDraft.className} onChange={(e) => setEditDraft((d) => ({ ...d, className: e.target.value }))} placeholder="Class name" className={inputCls} />
                  </td>
                  <td className="py-2 pr-3">
                    <input type="number" min="0" step="0.5" value={editDraft.hoursWorked} onChange={(e) => setEditDraft((d) => ({ ...d, hoursWorked: e.target.value }))} placeholder="0" className={inputCls} />
                  </td>
                  <td className="py-2 pr-3">
                    <input type="text" value={editDraft.attendees} onChange={(e) => setEditDraft((d) => ({ ...d, attendees: e.target.value }))} placeholder="e.g. 7/8" className={inputCls} />
                  </td>
                  <td className="py-2 pr-3">
                    <input type="text" value={editDraft.notes} onChange={(e) => setEditDraft((d) => ({ ...d, notes: e.target.value }))} placeholder="Any additional notes…" className={inputCls} />
                  </td>
                  <td className="py-2">
                    <div className="flex items-center gap-1">
                      <button onClick={() => saveEdit(entry.id)} disabled={saving} className="text-xs px-2 py-1 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50">
                        {saving ? "…" : "Save"}
                      </button>
                      <button onClick={() => setEditingId(null)} className="text-xs px-2 py-1 text-gray-400 hover:text-gray-600">
                        ✕
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                <tr key={entry.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors group cursor-pointer" onDoubleClick={() => !readOnly && startEdit(entry)}>
                  <td className="py-3 pr-3 text-gray-500 text-xs whitespace-nowrap">{fmt(entry.date)}</td>
                  <td className="py-3 pr-3 font-medium text-gray-800">{entry.className}</td>
                  <td className="py-3 pr-3 text-gray-700">{entry.hoursWorked}h</td>
                  <td className="py-3 pr-3 text-gray-700">{entry.attendees || <span className="text-gray-300">—</span>}</td>
                  <td className="py-3 pr-3 text-gray-500 text-xs">{entry.notes || <span className="text-gray-300">—</span>}</td>
                  <td className="py-3">
                    {!readOnly && (
                      <button
                        onClick={() => deleteEntry(entry.id)}
                        disabled={deleting === entry.id}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-300 hover:text-red-400 text-lg leading-none disabled:opacity-50"
                      >
                        {deleting === entry.id ? "…" : "×"}
                      </button>
                    )}
                  </td>
                </tr>
              )
            )}

            {entries.length === 0 && !pending && (
              <tr>
                <td colSpan={6} className="py-8 text-center text-gray-400">
                  No hours logged yet. Click &quot;+ Log hours&quot; to get started.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {!readOnly && pending && (
        <div className="grid grid-cols-[8rem_1fr_7rem_7rem_1fr_auto] gap-2 px-1 py-2 bg-orange-50 rounded-lg border border-orange-100 items-center text-sm">
          <input type="date" value={pending.date} onChange={(e) => setPending((p) => p && { ...p, date: e.target.value })} className={inputCls} />
          <input autoFocus type="text" placeholder="Class name *" value={pending.className} onChange={(e) => setPending((p) => p && { ...p, className: e.target.value })} onKeyDown={(e) => e.key === "Enter" && savePending()} className={inputCls} />
          <input type="number" min="0" step="0.5" placeholder="Hours *" value={pending.hoursWorked} onChange={(e) => setPending((p) => p && { ...p, hoursWorked: e.target.value })} onKeyDown={(e) => e.key === "Enter" && savePending()} className={inputCls} />
          <input type="text" placeholder="e.g. 7/8" value={pending.attendees} onChange={(e) => setPending((p) => p && { ...p, attendees: e.target.value })} className={inputCls} />
          <input type="text" placeholder="Notes (optional)" value={pending.notes} onChange={(e) => setPending((p) => p && { ...p, notes: e.target.value })} onKeyDown={(e) => e.key === "Enter" && savePending()} className={inputCls} />
          <div className="flex items-center gap-1">
            <button onClick={savePending} disabled={saving || !pending.className.trim() || !pending.hoursWorked} className="text-xs px-3 py-1.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-40 transition-colors">
              {saving ? "…" : "Save"}
            </button>
            <button onClick={() => setPending(null)} className="text-gray-400 hover:text-gray-600">✕</button>
          </div>
        </div>
      )}

      {!readOnly && (
        <>
          <button
            onClick={addRow}
            disabled={!!pending || !!editingId}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-orange-500 transition-colors py-1 px-2 rounded-lg hover:bg-orange-50 disabled:opacity-40 disabled:pointer-events-none w-fit"
          >
            <span className="text-lg leading-none">+</span> Log hours
          </button>
          <p className="text-xs text-gray-400">Double-click a row to edit it.</p>
        </>
      )}
    </div>
  );
}
