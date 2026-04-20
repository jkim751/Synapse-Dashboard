"use client";

import { useState } from "react";

type SubjectRow = {
  id: number;
  name: string;
  hourlyRate: number | null;
};

export default function PaySheetTable({ subjects }: { subjects: SubjectRow[] }) {
  const [rows, setRows] = useState<SubjectRow[]>(subjects);
  const [saving, setSaving] = useState<number | null>(null);
  const [drafts, setDrafts] = useState<Record<number, string>>({});

  const handleBlur = async (id: number) => {
    const raw = drafts[id];
    if (raw === undefined) return;

    const value = parseFloat(raw);
    if (isNaN(value) || value < 0) {
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      return;
    }

    setSaving(id);
    try {
      const res = await fetch("/api/paysheet", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subjectId: id, hourlyRate: value }),
      });
      if (res.ok) {
        setRows((prev) =>
          prev.map((r) => (r.id === id ? { ...r, hourlyRate: value } : r))
        );
      }
    } finally {
      setSaving(null);
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }
  };

  const displayValue = (row: SubjectRow) => {
    if (drafts[row.id] !== undefined) return drafts[row.id];
    if (row.hourlyRate !== null) return row.hourlyRate.toFixed(2);
    return "";
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-gray-500 border-b border-gray-100">
            <th className="pb-3 font-medium">Subject</th>
            <th className="pb-3 font-medium w-48">Hourly Rate ($)</th>
            <th className="pb-3 font-medium w-48 text-gray-400">Per Term <span className="text-xs font-normal">(10 wks)</span></th>
            <th className="pb-3 font-medium w-40 text-gray-400">GST <span className="text-xs font-normal">(10%)</span></th>
            <th className="pb-3 font-medium w-48 text-gray-400">Inc. GST</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const draftVal = drafts[row.id] !== undefined ? parseFloat(drafts[row.id]) : null;
            const effectiveRate = draftVal !== null && !isNaN(draftVal) ? draftVal : row.hourlyRate;
            const termRate = effectiveRate !== null ? effectiveRate * 10 : null;
            const gst = termRate !== null ? termRate * 0.1 : null;
            const incGst = termRate !== null ? termRate * 1.1 : null;
            return (
            <tr key={row.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
              <td className="py-3 pr-4 font-medium text-gray-800">{row.name}</td>
              <td className="py-2 pr-4">
                <div className="relative w-36">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="—"
                    value={displayValue(row)}
                    onChange={(e) =>
                      setDrafts((prev) => ({ ...prev, [row.id]: e.target.value }))
                    }
                    onBlur={() => handleBlur(row.id)}
                    className="w-full pl-7 pr-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-400 disabled:opacity-50"
                    disabled={saving === row.id}
                  />
                  {saving === row.id && (
                    <div className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
                  )}
                </div>
              </td>
              <td className="py-3 pr-4 text-gray-500">
                {termRate !== null ? `$${termRate.toFixed(2)}` : <span className="text-gray-300">—</span>}
              </td>
              <td className="py-3 pr-4 text-gray-500">
                {gst !== null ? `$${gst.toFixed(2)}` : <span className="text-gray-300">—</span>}
              </td>
              <td className="py-3 font-medium text-gray-800">
                {incGst !== null ? `$${incGst.toFixed(2)}` : <span className="text-gray-300 font-normal">—</span>}
              </td>
            </tr>
            );
          })}
          {rows.length === 0 && (
            <tr>
              <td colSpan={2} className="py-8 text-center text-gray-400">
                No subjects found. Add subjects first.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
