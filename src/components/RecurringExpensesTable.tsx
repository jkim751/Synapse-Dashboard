"use client";

import { useState, useEffect, useRef } from "react";

type Frequency = "weekly" | "fortnightly" | "monthly" | "quarterly" | "annually";

type RecurringExpense = {
  id: string;
  description: string;
  price: number;
  frequency: string;
  nextDate: string | null;
};

type PendingRow = {
  id: string; // temp client id
  description: string;
  price: string;
  frequency: Frequency;
  nextDate: string;
  saving: boolean;
};

const FREQUENCIES: { value: Frequency; label: string }[] = [
  { value: "weekly", label: "Weekly" },
  { value: "fortnightly", label: "Fortnightly" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "annually", label: "Annually" },
];

const monthlyEquivalent: Record<string, number> = {
  weekly: 52 / 12,
  fortnightly: 26 / 12,
  monthly: 1,
  quarterly: 1 / 3,
  annually: 1 / 12,
};

export default function RecurringExpensesTable({ isDirector }: { isDirector?: boolean }) {
  const [rows, setRows] = useState<RecurringExpense[]>([]);
  const [pending, setPending] = useState<PendingRow | null>(null);
  const [loading, setLoading] = useState(true);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetch('/api/expenses/recurring')
      .then(r => r.json())
      .then(data => setRows(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }, []);

  const saveField = (id: string, field: string, value: string) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      const body: Record<string, string | number> = { [field]: field === 'price' ? parseFloat(value) || 0 : value };
      await fetch(`/api/expenses/recurring/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    }, 600);
  };

  const updateRow = (id: string, field: keyof RecurringExpense, value: string) => {
    setRows(prev =>
      prev.map(r => r.id === id ? { ...r, [field]: field === 'price' ? parseFloat(value) || 0 : value } : r)
    );
    saveField(id, field, value);
  };

  const deleteRow = async (id: string) => {
    setRows(prev => prev.filter(r => r.id !== id));
    await fetch(`/api/expenses/recurring/${id}`, { method: 'DELETE' });
  };

  const addRow = () => {
    setPending({
      id: crypto.randomUUID(),
      description: '',
      price: '',
      frequency: 'monthly',
      nextDate: '',
      saving: false,
    });
  };

  const savePending = async () => {
    if (!pending || !pending.description.trim()) return;
    setPending(p => p ? { ...p, saving: true } : null);
    const res = await fetch('/api/expenses/recurring', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        description: pending.description,
        price: parseFloat(pending.price) || 0,
        frequency: pending.frequency,
        nextDate: pending.nextDate || null,
      }),
    });
    if (res.ok) {
      const saved = await res.json();
      setRows(prev => [...prev, saved]);
      setPending(null);
    }
  };

  const allRows = [
    ...rows.map(r => ({ price: r.price, frequency: r.frequency })),
    ...(pending ? [{ price: parseFloat(pending.price) || 0, frequency: pending.frequency }] : []),
  ];

  const monthlyTotal = allRows.reduce((sum, r) => {
    return sum + (Number(r.price) || 0) * (monthlyEquivalent[r.frequency] ?? 1);
  }, 0);
  const annualTotal = monthlyTotal * 12;

  if (loading) return <p className="text-sm text-gray-400">Loading…</p>;

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-x-auto rounded-xl border border-gray-300">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-gray-500 uppercase text-xs tracking-wider">
              <th className="px-4 py-3 text-left font-medium w-[38%]">Expense</th>
              <th className="px-4 py-3 text-left font-medium w-[18%]">Price</th>
              <th className="px-4 py-3 text-left font-medium w-[18%]">Frequency</th>
              <th className="px-4 py-3 text-left font-medium w-[18%]">Payment Date</th>
              <th className="px-4 py-3 w-[8%]" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {rows.map(row => (
              <tr key={row.id} className="group hover:bg-gray-50 transition-colors">
                <td className="px-4 py-2">
                  <input
                    type="text"
                    defaultValue={row.description}
                    onBlur={e => updateRow(row.id, 'description', e.target.value)}
                    placeholder="Enter expense description"
                    className="w-full bg-transparent outline-none placeholder-gray-300 text-gray-700"
                    disabled={!isDirector}
                  />
                </td>
                <td className="px-4 py-2">
                  <div className="flex items-center gap-1">
                    <span className="text-gray-400">$</span>
                    <input
                      type="number"
                      defaultValue={row.price}
                      onBlur={e => updateRow(row.id, 'price', e.target.value)}
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                      className="w-full bg-transparent outline-none placeholder-gray-300 text-gray-700"
                      disabled={!isDirector}
                    />
                  </div>
                </td>
                <td className="px-4 py-2">
                  <select
                    value={row.frequency}
                    onChange={e => updateRow(row.id, 'frequency', e.target.value)}
                    className="w-full bg-transparent outline-none text-gray-700 cursor-pointer disabled:cursor-default"
                    disabled={!isDirector}
                  >
                    {FREQUENCIES.map(f => (
                      <option key={f.value} value={f.value}>{f.label}</option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-2">
                  <input
                    type="date"
                    defaultValue={row.nextDate ?? ''}
                    onBlur={e => updateRow(row.id, 'nextDate', e.target.value)}
                    className="w-full bg-transparent outline-none text-gray-700"
                    disabled={!isDirector}
                  />
                </td>
                <td className="px-4 py-2 text-center">
                  {isDirector && (
                    <button
                      onClick={() => deleteRow(row.id)}
                      className="text-gray-300 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                      title="Delete"
                    >
                      ✕
                    </button>
                  )}
                </td>
              </tr>
            ))}

            {/* Pending new row */}
            {pending && (
              <tr className="bg-orange-50">
                <td className="px-4 py-2">
                  <input
                    autoFocus
                    type="text"
                    value={pending.description}
                    onChange={e => setPending(p => p ? { ...p, description: e.target.value } : null)}
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
                      onChange={e => setPending(p => p ? { ...p, price: e.target.value } : null)}
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                      className="w-full bg-transparent outline-none placeholder-gray-300 text-gray-700"
                    />
                  </div>
                </td>
                <td className="px-4 py-2">
                  <select
                    value={pending.frequency}
                    onChange={e => setPending(p => p ? { ...p, frequency: e.target.value as Frequency } : null)}
                    className="w-full bg-transparent outline-none text-gray-700 cursor-pointer"
                  >
                    {FREQUENCIES.map(f => (
                      <option key={f.value} value={f.value}>{f.label}</option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-2">
                  <input
                    type="date"
                    value={pending.nextDate}
                    onChange={e => setPending(p => p ? { ...p, nextDate: e.target.value } : null)}
                    className="w-full bg-transparent outline-none text-gray-700"
                  />
                </td>
                <td className="px-4 py-2 flex items-center justify-center gap-2 pt-3">
                  <button
                    onClick={savePending}
                    disabled={pending.saving || !pending.description.trim()}
                    className="text-xs px-2 py-1 bg-orange-500 text-white rounded hover:bg-orange-600 disabled:opacity-50"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setPending(null)}
                    className="text-xs text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                </td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr className="bg-gray-50 border-t-2 border-gray-300 font-semibold text-gray-700">
              <td className="px-4 py-3">Monthly total</td>
              <td className="px-4 py-3">
                <span className="text-gray-400 mr-1">$</span>
                {monthlyTotal.toFixed(2)}
              </td>
              <td colSpan={3} />
            </tr>
            <tr className="bg-gray-50 border-t border-gray-300 text-gray-500 text-xs">
              <td className="px-4 py-2">Annual total</td>
              <td className="px-4 py-2">
                <span className="text-gray-400 mr-1">$</span>
                {annualTotal.toFixed(2)}
              </td>
              <td colSpan={3} />
            </tr>
          </tfoot>
        </table>
      </div>

      {isDirector && !pending && (
        <button
          onClick={addRow}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-[#FC7118] transition-colors py-1 px-2 rounded-lg hover:bg-orange-50"
        >
          <span className="text-lg leading-none">+</span>
          Add row
        </button>
      )}
    </div>
  );
}
