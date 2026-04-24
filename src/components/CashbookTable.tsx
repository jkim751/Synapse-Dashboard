"use client";

import { useCallback, useEffect, useState } from "react";

type Entry = {
  id: string;
  name: string;
  amount: number;
  date: string;
  xero: boolean;
  receipt: boolean;
  cashbook: boolean;
  addedBy: string | null;
};

const PAGE_SIZE = 20;

function toDateInput(isoString: string) {
  const d = new Date(isoString);
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
}

function todayStr() {
  const d = new Date();
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
}

type PendingEntry = { name: string; amount: string; date: string };

export default function CashbookTable() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const [pending, setPending] = useState<PendingEntry | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchPage = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/cashbook?page=${p}`);
      const data = await res.json();
      setEntries(data.entries ?? []);
      setTotal(data.total ?? 0);
      setPages(data.pages ?? 1);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPage(page);
  }, [page, fetchPage]);

  const toggleFlag = async (id: string, field: "xero" | "receipt" | "cashbook", current: boolean) => {
    setEntries(prev =>
      prev.map(e => (e.id === id ? { ...e, [field]: !current } : e))
    );
    await fetch(`/api/cashbook/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: !current }),
    });
  };

  const updateField = async (
    id: string,
    field: "name" | "amount" | "date",
    value: string
  ) => {
    if (!value.trim()) return;
    await fetch(`/api/cashbook/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    });
  };

  const deleteEntry = async (id: string) => {
    setEntries(prev => prev.filter(e => e.id !== id));
    setTotal(t => t - 1);
    await fetch(`/api/cashbook/${id}`, { method: "DELETE" });
  };

  const savePending = async () => {
    if (!pending || !pending.name.trim() || !pending.amount) return;
    setSaving(true);
    try {
      const res = await fetch("/api/cashbook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pending),
      });
      if (res.ok) {
        const entry: Entry = await res.json();
        setEntries(prev => [entry, ...prev]);
        setTotal(t => t + 1);
        setPending(null);
      }
    } finally {
      setSaving(false);
    }
  };

  const startRow = () => {
    if (pending) return;
    setPending({ name: "", amount: "", date: todayStr() });
  };

  const totalAmount = entries.reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-400">
          {total} {total === 1 ? "entry" : "entries"}
        </p>
        <button
          onClick={startRow}
          disabled={!!pending}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#FC7118] transition-colors py-1 px-2 rounded-lg hover:bg-orange-50 disabled:opacity-40 disabled:pointer-events-none"
        >
          <span className="text-lg leading-none">+</span>
          Add entry
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-gray-500 uppercase text-xs tracking-wider border-b border-gray-200">
              <th className="px-4 py-3 text-left font-medium w-[10%]">Date</th>
              <th className="px-4 py-3 text-left font-medium w-[40%]">Name</th>
              <th className="px-4 py-3 text-left font-medium w-[15%]">Amount</th>
              <th className="px-4 py-3 text-center font-medium w-[10%]">Xero</th>
              <th className="px-4 py-3 text-center font-medium w-[10%]">Receipt</th>
              <th className="px-4 py-3 text-center font-medium w-[10%]">Cashbook</th>
              <th className="px-4 py-3 w-[5%]" />
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100">
            {/* New pending row */}
            {pending && (
              <tr className="bg-orange-50">
                <td className="px-4 py-2">
                  <input
                    type="date"
                    value={pending.date}
                    onChange={e => setPending(p => p && { ...p, date: e.target.value })}
                    className="w-full bg-transparent outline-none text-gray-700 text-xs"
                  />
                </td>
                <td className="px-4 py-2">
                  <input
                    autoFocus
                    type="text"
                    value={pending.name}
                    onChange={e => setPending(p => p && { ...p, name: e.target.value })}
                    onKeyDown={e => e.key === "Enter" && savePending()}
                    placeholder="Entry name…"
                    className="w-full bg-transparent outline-none placeholder-gray-300 text-gray-700"
                  />
                </td>
                <td className="px-4 py-2">
                  <div className="flex items-center gap-1">
                    <span className="text-gray-400">$</span>
                    <input
                      type="number"
                      value={pending.amount}
                      onChange={e => setPending(p => p && { ...p, amount: e.target.value })}
                      onKeyDown={e => e.key === "Enter" && savePending()}
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                      className="w-full bg-transparent outline-none placeholder-gray-300 text-gray-700"
                    />
                  </div>
                </td>
                <td colSpan={3} />
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={savePending}
                      disabled={saving || !pending.name.trim() || !pending.amount}
                      className="text-xs px-2.5 py-1 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {saving ? "…" : "Save"}
                    </button>
                    <button
                      onClick={() => setPending(null)}
                      className="text-gray-300 hover:text-gray-500 transition-colors text-lg leading-none"
                      title="Cancel"
                    >
                      ×
                    </button>
                  </div>
                </td>
              </tr>
            )}

            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-gray-300">
                  Loading…
                </td>
              </tr>
            ) : entries.length === 0 && !pending ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-gray-300">
                  No entries yet — click &ldquo;+ Add entry&rdquo; to get started.
                </td>
              </tr>
            ) : (
              entries.map(entry => (
                <tr key={entry.id} className="group hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-2 text-gray-500">
                    <input
                      type="date"
                      defaultValue={toDateInput(entry.date)}
                      onBlur={e => updateField(entry.id, "date", e.target.value)}
                      className="bg-transparent outline-none text-gray-500 text-xs w-28"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="text"
                      defaultValue={entry.name}
                      onBlur={e => updateField(entry.id, "name", e.target.value)}
                      placeholder="—"
                      className="w-full bg-transparent outline-none text-gray-700 placeholder-gray-300"
                    />
                    {entry.addedBy && (
                      <p className="text-[10px] text-gray-400 mt-0.5 leading-none">
                        Added by {entry.addedBy}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-1">
                      <span className="text-gray-400">$</span>
                      <input
                        type="number"
                        defaultValue={entry.amount}
                        onBlur={e => updateField(entry.id, "amount", e.target.value)}
                        placeholder="0.00"
                        min="0"
                        step="0.01"
                        className="w-full bg-transparent outline-none text-gray-700 placeholder-gray-300"
                      />
                    </div>
                  </td>
                  <td className="px-4 py-2 text-center">
                    <input
                      type="checkbox"
                      checked={entry.xero}
                      onChange={() => toggleFlag(entry.id, "xero", entry.xero)}
                      className="cursor-pointer mx-auto"
                    />
                  </td>
                  <td className="px-4 py-2 text-center">
                    <input
                      type="checkbox"
                      checked={entry.receipt}
                      onChange={() => toggleFlag(entry.id, "receipt", entry.receipt)}
                      className="cursor-pointer mx-auto"
                    />
                  </td>
                  <td className="px-4 py-2 text-center">
                    <input
                      type="checkbox"
                      checked={entry.cashbook}
                      onChange={() => toggleFlag(entry.id, "cashbook", entry.cashbook)}
                      className="cursor-pointer mx-auto"
                    />
                  </td>
                  <td className="px-4 py-2 text-center">
                    <button
                      onClick={() => deleteEntry(entry.id)}
                      className="text-gray-200 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                      title="Delete entry"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>

          {entries.length > 0 && (
            <tfoot>
              <tr className="bg-gray-50 border-t-2 border-gray-200 font-semibold text-gray-700">
                <td className="px-4 py-3" />
                <td className="px-4 py-3">Total</td>
                <td className="px-4 py-3">
                  <span className="text-gray-400 mr-1">$</span>
                  {totalAmount.toFixed(2)}
                </td>
                <td colSpan={4} />
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <p className="text-gray-400">
            {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-gray-600"
            >
              ← Prev
            </button>
            <span className="px-3 py-1.5 text-gray-500 tabular-nums">
              {page} / {pages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(pages, p + 1))}
              disabled={page === pages}
              className="px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-gray-600"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
