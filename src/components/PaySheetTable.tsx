"use client";

import { useState } from "react";

type ClassType = "private" | "group";

type SubjectRow = {
  id: number;
  name: string;
  classType: ClassType | null;
  rate: number | null;
};

function deriveType(privateRate: number | null, groupRate: number | null): ClassType | null {
  if (privateRate !== null) return "private";
  if (groupRate !== null) return "group";
  return null;
}

function deriveRate(privateRate: number | null, groupRate: number | null): number | null {
  return privateRate ?? groupRate ?? null;
}

const TYPE_LABELS: Record<ClassType, string> = { private: "Private", group: "Group" };
const TYPE_COLORS: Record<ClassType, string> = {
  private: "bg-purple-100 text-purple-700",
  group: "bg-blue-100 text-blue-700",
};

export default function PaySheetTable({
  subjects,
}: {
  subjects: { id: number; name: string; privateRate: number | null; groupRate: number | null }[];
}) {
  const [rows, setRows] = useState<SubjectRow[]>(
    subjects.map((s) => ({
      id: s.id,
      name: s.name,
      classType: deriveType(s.privateRate, s.groupRate),
      rate: deriveRate(s.privateRate, s.groupRate),
    }))
  );
  const [saving, setSaving] = useState<number | null>(null);
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [deleting, setDeleting] = useState<number | null>(null);

  const [showAddRow, setShowAddRow] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<ClassType>("private");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState("");

  const getDraftValue = (row: SubjectRow) => {
    if (drafts[row.id] !== undefined) return drafts[row.id];
    return row.rate !== null ? row.rate.toFixed(2) : "";
  };

  const getEffectiveRate = (row: SubjectRow) => {
    const draft = drafts[row.id];
    if (draft !== undefined) {
      const n = parseFloat(draft);
      return isNaN(n) ? null : n;
    }
    return row.rate;
  };

  const handleBlur = async (row: SubjectRow) => {
    const raw = drafts[row.id];
    if (raw === undefined) return;

    const value = raw === "" ? null : parseFloat(raw);
    if (value !== null && (isNaN(value) || value < 0)) {
      setDrafts((prev) => { const next = { ...prev }; delete next[row.id]; return next; });
      return;
    }

    setSaving(row.id);
    try {
      const body =
        row.classType === "group"
          ? { subjectId: row.id, groupRate: value, privateRate: null }
          : { subjectId: row.id, privateRate: value, groupRate: null };

      const res = await fetch("/api/paysheet", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, rate: value } : r)));
      }
    } finally {
      setSaving(null);
      setDrafts((prev) => { const next = { ...prev }; delete next[row.id]; return next; });
    }
  };

  const handleAdd = async () => {
    const name = newName.trim();
    if (!name) return;
    setAdding(true);
    setAddError("");
    try {
      const res = await fetch("/api/paysheet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, classType: newType }),
      });
      const json = await res.json();
      if (res.ok) {
        setRows((prev) => {
          const extractNum = (n: string) => { const m = n.match(/\d+/); return m ? parseInt(m[0], 10) : -1; };
          return [...prev, { id: json.id, name: json.name, classType: newType, rate: null }].sort((a, b) => {
            const na = extractNum(a.name), nb = extractNum(b.name);
            if (na !== nb) return nb - na;
            return a.name.localeCompare(b.name);
          });
        });
        setNewName("");
        setShowAddRow(false);
      } else {
        setAddError(json.error ?? "Failed to add subject");
      }
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (id: number) => {
    setDeleting(id);
    try {
      const res = await fetch(`/api/paysheet/${id}`, { method: "DELETE" });
      if (res.ok) setRows((prev) => prev.filter((r) => r.id !== id));
    } finally {
      setDeleting(null);
    }
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
        <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg space-y-2">
          <div className="flex items-center gap-2">
            <input
              autoFocus
              type="text"
              placeholder="Subject name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAdd();
                if (e.key === "Escape") { setShowAddRow(false); setNewName(""); setAddError(""); }
              }}
              className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-400"
            />
            <div className="flex rounded-lg overflow-hidden border border-gray-200 text-sm">
              {(["private", "group"] as ClassType[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setNewType(t)}
                  className={`px-3 py-1.5 transition-colors ${
                    newType === t
                      ? t === "private"
                        ? "bg-purple-500 text-white"
                        : "bg-blue-500 text-white"
                      : "bg-white text-gray-500 hover:bg-gray-50"
                  }`}
                >
                  {TYPE_LABELS[t]}
                </button>
              ))}
            </div>
            <button
              onClick={handleAdd}
              disabled={adding || !newName.trim()}
              className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white text-sm rounded-lg transition-colors"
            >
              {adding ? "Adding…" : "Save"}
            </button>
            <button
              onClick={() => { setShowAddRow(false); setNewName(""); setAddError(""); }}
              className="px-3 py-1.5 text-gray-500 hover:text-gray-700 text-sm"
            >
              Cancel
            </button>
          </div>
          {addError && <p className="text-sm text-red-500">{addError}</p>}
        </div>
      )}

      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-gray-500 border-b border-gray-100">
            <th className="pb-3 font-medium">Subject</th>
            <th className="pb-3 font-medium w-40">Hourly Rate ($)</th>
            <th className="pb-3 font-medium w-36 text-gray-400">
              Per Term <span className="text-xs font-normal">(10 wks)</span>
            </th>
            <th className="pb-3 font-medium w-36 text-gray-400">
              Per Term <span className="text-xs font-normal">(11 wks)</span>
            </th>
            <th className="pb-3 font-medium w-32 text-gray-400">
              GST <span className="text-xs font-normal">(10%)</span>
            </th>
            <th className="pb-3 font-medium w-36 text-gray-400">Inc. GST</th>
            <th className="pb-3 w-10" />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const effectiveRate = getEffectiveRate(row);
            const term10 = effectiveRate !== null ? effectiveRate * 10 : null;
            const term11 = effectiveRate !== null ? effectiveRate * 11 : null;
            const gst = term10 !== null ? term10 * 0.1 : null;
            const incGst = term10 !== null ? term10 * 1.1 : null;
            const isSaving = saving === row.id;
            const isDeleting = deleting === row.id;

            return (
              <tr key={row.id} className="group border-b border-gray-50 hover:bg-gray-50 transition-colors">
                <td className="py-3 pr-4">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-800">{row.name}</span>
                    {row.classType && (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_COLORS[row.classType]}`}>
                        {TYPE_LABELS[row.classType]}
                      </span>
                    )}
                  </div>
                </td>
                <td className="py-2 pr-4">
                  <div className="relative w-32">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="—"
                      value={getDraftValue(row)}
                      onChange={(e) => setDrafts((prev) => ({ ...prev, [row.id]: e.target.value }))}
                      onBlur={() => handleBlur(row)}
                      className="w-full pl-7 pr-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-400 disabled:opacity-50"
                      disabled={isSaving}
                    />
                    {isSaving && (
                      <div className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
                    )}
                  </div>
                </td>
                <td className="py-3 pr-4 text-gray-500">
                  {term10 !== null ? `$${term10.toFixed(2)}` : <span className="text-gray-300">—</span>}
                </td>
                <td className="py-3 pr-4 text-gray-500">
                  {term11 !== null ? `$${term11.toFixed(2)}` : <span className="text-gray-300">—</span>}
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
                No subjects yet. Click &quot;+ Add Subject&quot; to get started.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
