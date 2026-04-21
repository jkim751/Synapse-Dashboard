"use client";

import { useState } from "react";
import Table from "@/components/Table";

export type PayEntry = {
  id: string;
  name: string;
  personType: "TUTOR" | "ADMIN";
  payRate: number;
  description: string | null;
};

const columns = [
  { header: "Name", accessor: "name" },
  { header: "Role", accessor: "role", className: "hidden md:table-cell" },
  { header: "Pay Rate", accessor: "payRate" },
  { header: "", accessor: "delete" },
];

type Pending = { name: string; personType: "TUTOR" | "ADMIN"; payRate: string };

export default function PayTable({ data: initialData }: { data: PayEntry[] }) {
  const [data, setData] = useState(initialData);
  const [pending, setPending] = useState<Pending | null>(null);
  const [editingDesc, setEditingDesc] = useState<string | null>(null);
  const [descDraft, setDescDraft] = useState("");

  const addRow = () => {
    if (pending) return;
    setPending({ name: "", personType: "TUTOR", payRate: "" });
  };

  const cancelPending = () => setPending(null);

  const savePending = async () => {
    if (!pending || !pending.name.trim() || !pending.payRate) return;
    const payRateVal = parseFloat(pending.payRate);
    if (isNaN(payRateVal)) return;

    const res = await fetch("/api/pay", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: pending.name.trim(),
        personType: pending.personType,
        payRate: payRateVal,
      }),
    });
    const created: PayEntry = await res.json();
    setData((prev) => [...prev, { ...created, description: null }]);
    setPending(null);
  };

  const deleteRow = async (id: string) => {
    setData((prev) => prev.filter((r) => r.id !== id));
    await fetch(`/api/pay/${id}`, { method: "DELETE" });
  };

  const startEditDesc = (entry: PayEntry) => {
    setEditingDesc(entry.id);
    setDescDraft(entry.description ?? "");
  };

  const saveDesc = async (id: string) => {
    const trimmed = descDraft.trim();
    await fetch(`/api/pay/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ description: trimmed }),
    });
    setData((prev) =>
      prev.map((r) => (r.id === id ? { ...r, description: trimmed || null } : r))
    );
    setEditingDesc(null);
  };

  const renderRow = (entry: PayEntry) => (
    <tr
      key={entry.id}
      className="border-b border-gray-200 even:bg-slate-50 text-sm hover:bg-lamaSkyLight group"
    >
      <td className="p-4">
        <div className="font-semibold text-gray-800">{entry.name}</div>
        {editingDesc === entry.id ? (
          <textarea
            autoFocus
            value={descDraft}
            onChange={(e) => setDescDraft(e.target.value)}
            onBlur={() => saveDesc(entry.id)}
            onKeyDown={(e) => { if (e.key === "Escape") setEditingDesc(null); }}
            placeholder="Describe pay structure…"
            rows={2}
            className="mt-1 w-full text-xs text-gray-600 bg-orange-50 border border-orange-200 rounded-md px-2 py-1 resize-none focus:outline-none focus:border-orange-400"
          />
        ) : (
          <div
            onClick={() => startEditDesc(entry)}
            className="mt-0.5 cursor-text"
            title="Click to edit description"
          >
            {entry.description ? (
              <p className="text-xs text-gray-400 italic leading-snug">{entry.description}</p>
            ) : (
              <p className="text-xs text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity italic">
                + add note
              </p>
            )}
          </div>
        )}
      </td>
      <td className="hidden md:table-cell p-4">
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${
            entry.personType === "TUTOR"
              ? "bg-blue-100 text-blue-700"
              : "bg-purple-100 text-purple-700"
          }`}
        >
          {entry.personType === "TUTOR" ? "Tutor" : "Admin"}
        </span>
      </td>
      <td className="p-4 font-medium">${entry.payRate.toFixed(2)}</td>
      <td className="p-4 text-right">
        <button
          onClick={() => deleteRow(entry.id)}
          className="text-gray-300 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
          title="Remove"
        >
          ✕
        </button>
      </td>
    </tr>
  );

  return (
    <div className="flex flex-col gap-4">
      <Table columns={columns} renderRow={renderRow} data={data} />

      {pending && (
        <div className="flex items-center gap-3 px-4 py-2 bg-orange-50 rounded-lg border border-orange-100 text-sm">
          <input
            type="text"
            autoFocus
            placeholder="Full name"
            value={pending.name}
            onChange={(e) => setPending((p) => p && { ...p, name: e.target.value })}
            onKeyDown={(e) => e.key === "Enter" && savePending()}
            className="flex-1 bg-transparent outline-none placeholder-gray-400 text-gray-700"
          />
          <select
            value={pending.personType}
            onChange={(e) =>
              setPending((p) => p && { ...p, personType: e.target.value as "TUTOR" | "ADMIN" })
            }
            className="bg-transparent outline-none text-gray-700 border border-gray-200 rounded px-2 py-1"
          >
            <option value="TUTOR">Tutor</option>
            <option value="ADMIN">Admin</option>
          </select>
          <div className="flex items-center gap-1">
            <span className="text-gray-400">$</span>
            <input
              type="number"
              placeholder="0.00"
              value={pending.payRate}
              onChange={(e) => setPending((p) => p && { ...p, payRate: e.target.value })}
              onKeyDown={(e) => e.key === "Enter" && savePending()}
              min="0"
              step="0.01"
              className="w-24 bg-transparent outline-none placeholder-gray-400 text-gray-700"
            />
          </div>
          <button
            onClick={savePending}
            className="text-xs px-3 py-1 bg-[#FC7118] text-white rounded-lg hover:bg-orange-600 transition-colors"
          >
            Save
          </button>
          <button
            onClick={cancelPending}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            ✕
          </button>
        </div>
      )}

      <button
        onClick={addRow}
        disabled={!!pending}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-[#FC7118] transition-colors py-1 px-2 rounded-lg hover:bg-orange-50 disabled:opacity-40 disabled:pointer-events-none w-fit"
      >
        <span className="text-lg leading-none">+</span>
        Add person
      </button>
    </div>
  );
}
