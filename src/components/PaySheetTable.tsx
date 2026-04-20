"use client";

import { useState } from "react";

type SubjectRow = {
  id: number;
  name: string;
  privateRate: number | null;
  groupRate: number | null;
};

type DraftKey = `${number}-${"private" | "group"}`;

export default function PaySheetTable({ subjects }: { subjects: SubjectRow[] }) {
  const [rows, setRows] = useState<SubjectRow[]>(subjects);
  const [saving, setSaving] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<DraftKey, string>>({});
  const [deleting, setDeleting] = useState<number | null>(null);
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);
  const [showAddRow, setShowAddRow] = useState(false);

  const draftKey = (id: number, type: "private" | "group"): DraftKey => `${id}-${type}`;

  const getDraftValue = (row: SubjectRow, type: "private" | "group") => {
    const key = draftKey(row.id, type);
    if (drafts[key] !== undefined) return drafts[key];
    const val = type === "private" ? row.privateRate : row.groupRate;
    return val !== null ? val.toFixed(2) : "";
  };

  const getEffectiveRate = (row: SubjectRow, type: "private" | "group") => {
    const key = draftKey(row.id, type);
    const draft = drafts[key];
    if (draft !== undefined) {
      const n = parseFloat(draft);
      return isNaN(n) ? null : n;
    }
    return type === "private" ? row.privateRate : row.groupRate;
  };

  const handleBlur = async (id: number, type: "private" | "group") => {
    const key = draftKey(id, type);
    const raw = drafts[key];
    if (raw === undefined) return;

    const value = raw === "" ? null : parseFloat(raw);
    if (value !== null && (isNaN(value) || value < 0)) {
      setDrafts((prev) => { const next = { ...prev }; delete next[key]; return next; });
      return;
    }

    setSaving(key);
    try {
      const res = await fetch("/api/paysheet", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subjectId: id, [`${type}Rate`]: value }),
      });
      if (res.ok) {
        setRows((prev) =>
          prev.map((r) =>
            r.id === id ? { ...r, [`${type}Rate`]: value } : r
          )
        );
      }
    } finally {
      setSaving(null);
      setDrafts((prev) => { const next = { ...prev }; delete next[key]; return next; });
    }
  };

  const handleAdd = async () => {
    const name = newName.trim();
    if (!name) return;
    setAdding(true);
    try {
      const res = await fetch("/api/paysheet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (res.ok) {
        const subject = await res.json();
        setRows((prev) =>
          [...prev, { id: subject.id, name: subject.name, privateRate: null, groupRate: null }]
            .sort((a, b) => a.name.localeCompare(b.name))
        );
        setNewName("");
        setShowAddRow(false);
      }
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (id: number) => {
    setDeleting(id);
    try {
      const res = await fetch(`/api/paysheet/${id}`, { method: "DELETE" });
      if (res.ok) {
        setRows((prev) => prev.filter((r) => r.id !== id));
      }
    } finally {
      setDeleting(null);
    }
  };

  const computed = (rate: number | null) => {
    if (rate === null) return { term: null, gst: null, incGst: null };
    const term = rate * 10;
    return { term, gst: term * 0.1, incGst: term * 1.1 };
  };

  return (
    <div className="overflow-x-auto">
      <div className="flex justify-end mb-3">
        <button
          onClick={() => setShowAddRow((v) => !v)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white text-sm rounded-lg transition-colors"
        >
          <span className="text-base leading-none">+</span> Add Subject
        </button>
      </div>

      {showAddRow && (
        <div className="flex items-center gap-2 mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
          <input
            autoFocus
            type="text"
            placeholder="Subject name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); if (e.key === "Escape") { setShowAddRow(false); setNewName(""); } }}
            className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-400"
          />
          <button
            onClick={handleAdd}
            disabled={adding || !newName.trim()}
            className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white text-sm rounded-lg transition-colors"
          >
            {adding ? "Adding…" : "Save"}
          </button>
          <button
            onClick={() => { setShowAddRow(false); setNewName(""); }}
            className="px-3 py-1.5 text-gray-500 hover:text-gray-700 text-sm"
          >
            Cancel
          </button>
        </div>
      )}

      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-gray-500 border-b border-gray-100">
            <th className="pb-3 font-medium">Subject</th>
            <th className="pb-3 font-medium w-40">Private Rate ($)</th>
            <th className="pb-3 font-medium w-40">Group Rate ($)</th>
            <th className="pb-3 font-medium w-36 text-gray-400">Per Term <span className="text-xs font-normal">(10 wks)</span></th>
            <th className="pb-3 font-medium w-32 text-gray-400">GST <span className="text-xs font-normal">(10%)</span></th>
            <th className="pb-3 font-medium w-36 text-gray-400">Inc. GST</th>
            <th className="pb-3 w-10" />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const privateRate = getEffectiveRate(row, "private");
            const groupRate = getEffectiveRate(row, "group");
            // Show computed columns based on whichever rate is set (private takes priority)
            const activeRate = privateRate ?? groupRate;
            const { term, gst, incGst } = computed(activeRate);
            const isDeleting = deleting === row.id;

            return (
              <tr key={row.id} className="group border-b border-gray-50 hover:bg-gray-50 transition-colors">
                <td className="py-3 pr-4 font-medium text-gray-800">{row.name}</td>

                {(["private", "group"] as const).map((type) => {
                  const key = draftKey(row.id, type);
                  const isSaving = saving === key;
                  return (
                    <td key={type} className="py-2 pr-4">
                      <div className="relative w-32">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="—"
                          value={getDraftValue(row, type)}
                          onChange={(e) => setDrafts((prev) => ({ ...prev, [key]: e.target.value }))}
                          onBlur={() => handleBlur(row.id, type)}
                          className="w-full pl-7 pr-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-400 disabled:opacity-50"
                          disabled={isSaving}
                        />
                        {isSaving && (
                          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
                        )}
                      </div>
                    </td>
                  );
                })}

                <td className="py-3 pr-4 text-gray-500">
                  {term !== null ? `$${term.toFixed(2)}` : <span className="text-gray-300">—</span>}
                </td>
                <td className="py-3 pr-4 text-gray-500">
                  {gst !== null ? `$${gst.toFixed(2)}` : <span className="text-gray-300">—</span>}
                </td>
                <td className="py-3 font-medium text-gray-800">
                  {incGst !== null ? `$${incGst.toFixed(2)}` : <span className="text-gray-300 font-normal">—</span>}
                </td>
                <td className="py-3 text-right">
                  <button
                    onClick={() => handleDelete(row.id)}
                    disabled={isDeleting}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-300 hover:text-red-500 disabled:opacity-50 text-lg leading-none"
                    title="Delete subject"
                  >
                    {isDeleting ? "…" : "×"}
                  </button>
                </td>
              </tr>
            );
          })}
          {rows.length === 0 && (
            <tr>
              <td colSpan={7} className="py-8 text-center text-gray-400">
                No subjects yet. Click "+ Add Subject" to get started.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
