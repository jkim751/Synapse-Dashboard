"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Expense = {
  id: string;
  description: string;
  price: string;
  date: string; // YYYY-MM-DD
};

type RemoteExpense = {
  id: string;
  description: string;
  price: number;
  date: string;
};

function toYearMonth(date: Date) {
  return { year: date.getFullYear(), month: date.getMonth() };
}

function formatMonthLabel(year: number, month: number) {
  return new Date(year, month, 1).toLocaleString("default", {
    month: "long",
    year: "numeric",
  });
}

function monthKey(year: number, month: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}`;
}

function firstOfMonth(year: number, month: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-01`;
}

function toLocalDateString(isoString: string) {
  const d = new Date(isoString);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function toRow(e: RemoteExpense): Expense {
  return {
    id: e.id,
    description: e.description,
    price: String(e.price),
    date: toLocalDateString(e.date),
  };
}

function emptyRow(year: number, month: number): Expense {
  return { id: "", description: "", price: "", date: firstOfMonth(year, month) };
}

export default function ExpensesTable() {
  const today = new Date();
  const [current, setCurrent] = useState(toYearMonth(today));
  const { year, month } = current;

  // Loaded months cache: monthKey → Expense[]
  const [cache, setCache] = useState<Record<string, Expense[]>>({});
  const loadedMonths = useRef<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  // Pending row (not yet saved) for the current month
  const [pending, setPending] = useState<Expense | null>(null);

  const key = monthKey(year, month);
  const rows = cache[key] ?? [];

  const loadMonth = useCallback(async (y: number, m: number) => {
    const k = monthKey(y, m);
    if (loadedMonths.current.has(k)) return;
    loadedMonths.current.add(k);
    setLoading(true);
    try {
      const res = await fetch(`/api/expenses?year=${y}&month=${m}`);
      const data: RemoteExpense[] = await res.json();
      setCache((prev) => ({ ...prev, [k]: data.map(toRow) }));
    } finally {
      setLoading(false);
    }
  }, []);

  // Load current month on mount and on navigation
  useEffect(() => {
    loadMonth(year, month);
  }, [year, month, loadMonth]);

  const prevMonth = () =>
    setCurrent(({ year, month }) =>
      month === 0 ? { year: year - 1, month: 11 } : { year, month: month - 1 }
    );

  const nextMonth = () =>
    setCurrent(({ year, month }) =>
      month === 11 ? { year: year + 1, month: 0 } : { year, month: month + 1 }
    );

  // Save pending row to DB
  const savePending = async () => {
    if (!pending || (!pending.description && !pending.price)) return;
    const res = await fetch("/api/expenses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(pending),
    });
    const saved: RemoteExpense = await res.json();
    setCache((prev) => ({ ...prev, [key]: [...(prev[key] ?? []), toRow(saved)] }));
    setPending(null);
  };

  const addRow = () => {
    if (pending) return; // only one pending at a time
    setPending(emptyRow(year, month));
  };

  // Update a saved row (debounced via blur)
  const updateSaved = async (id: string, field: keyof Expense, value: string) => {
    setCache((prev) => ({
      ...prev,
      [key]: (prev[key] ?? []).map((r) =>
        r.id === id ? { ...r, [field]: value } : r
      ),
    }));
    await fetch(`/api/expenses/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    });
  };

  const deleteRow = async (id: string) => {
    setCache((prev) => ({
      ...prev,
      [key]: (prev[key] ?? []).filter((r) => r.id !== id),
    }));
    await fetch(`/api/expenses/${id}`, { method: "DELETE" });
  };

  const parsePrice = (p: string) => {
    const v = parseFloat(p);
    return isNaN(v) ? 0 : v;
  };

  const total = rows.reduce((sum, r) => sum + parsePrice(r.price), 0);

  return (
    <div className="flex flex-col gap-4">
      {/* Month navigator */}
      <div className="flex items-center gap-3">
        <button
          onClick={prevMonth}
          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
          title="Previous month"
        >
          ‹
        </button>
        <span className="text-sm font-semibold text-gray-700 w-36 text-center">
          {formatMonthLabel(year, month)}
        </span>
        <button
          onClick={nextMonth}
          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
          title="Next month"
        >
          ›
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-gray-300">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-gray-500 uppercase text-xs tracking-wider">
              <th className="px-4 py-3 text-left font-medium w-[50%]">Expense</th>
              <th className="px-4 py-3 text-left font-medium w-[20%]">Price</th>
              <th className="px-4 py-3 text-left font-medium w-[20%]">Date</th>
              <th className="px-4 py-3 w-[10%]" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-gray-300 text-sm">
                  Loading…
                </td>
              </tr>
            ) : rows.length === 0 && !pending ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-gray-300 text-sm">
                  No expenses for {formatMonthLabel(year, month)}
                </td>
              </tr>
            ) : (
              <>
                {rows.map((row) => (
                  <tr key={row.id} className="group hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-2">
                      <input
                        type="text"
                        defaultValue={row.description}
                        onBlur={(e) => updateSaved(row.id, "description", e.target.value)}
                        placeholder="Enter expense description"
                        className="w-full bg-transparent outline-none placeholder-gray-300 text-gray-700"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-1">
                        <span className="text-gray-400">$</span>
                        <input
                          type="number"
                          defaultValue={row.price}
                          onBlur={(e) => updateSaved(row.id, "price", e.target.value)}
                          placeholder="0.00"
                          min="0"
                          step="0.01"
                          className="w-full bg-transparent outline-none placeholder-gray-300 text-gray-700"
                        />
                      </div>
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="date"
                        defaultValue={row.date}
                        onBlur={(e) => updateSaved(row.id, "date", e.target.value)}
                        className="w-full bg-transparent outline-none text-gray-700"
                      />
                    </td>
                    <td className="px-4 py-2 text-center">
                      <button
                        onClick={() => deleteRow(row.id)}
                        className="text-gray-400 hover:text-red-400 transition-colors"
                        title="Remove row"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}

                {/* Unsaved pending row */}
                {pending && (
                  <tr className="bg-orange-50">
                    <td className="px-4 py-2">
                      <input
                        autoFocus
                        type="text"
                        value={pending.description}
                        onChange={(e) => setPending((p) => p && { ...p, description: e.target.value })}
                        onBlur={savePending}
                        placeholder="Enter expense description"
                        className="w-full bg-transparent outline-none placeholder-gray-300 text-gray-700"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-1">
                        <span className="text-gray-400">$</span>
                        <input
                          type="number"
                          value={pending.price}
                          onChange={(e) => setPending((p) => p && { ...p, price: e.target.value })}
                          onBlur={savePending}
                          placeholder="0.00"
                          min="0"
                          step="0.01"
                          className="w-full bg-transparent outline-none placeholder-gray-300 text-gray-700"
                        />
                      </div>
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="date"
                        value={pending.date}
                        onChange={(e) => setPending((p) => p && { ...p, date: e.target.value })}
                        onBlur={savePending}
                        className="w-full bg-transparent outline-none text-gray-700"
                      />
                    </td>
                    <td className="px-4 py-2 text-center">
                      <button
                        onClick={() => setPending(null)}
                        className="text-gray-400 hover:text-red-400 transition-colors"
                        title="Cancel"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                )}
              </>
            )}
          </tbody>
          <tfoot>
            <tr className="bg-gray-50 border-t-2 border-gray-300 font-semibold text-gray-700">
              <td className="px-4 py-3">Total</td>
              <td className="px-4 py-3">
                <span className="text-gray-400 mr-1">$</span>
                {total.toFixed(2)}
              </td>
              <td colSpan={2} />
            </tr>
          </tfoot>
        </table>
      </div>

      <div>
        <button
          onClick={addRow}
          disabled={!!pending}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-[#FC7118] transition-colors py-1 px-2 rounded-lg hover:bg-orange-50 disabled:opacity-40 disabled:pointer-events-none"
        >
          <span className="text-lg leading-none">+</span>
          Add row
        </button>
      </div>
    </div>
  );
}
