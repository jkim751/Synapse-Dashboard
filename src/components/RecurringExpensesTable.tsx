"use client";

import { useState } from "react";

type Frequency = "weekly" | "fortnightly" | "monthly" | "quarterly" | "annually";

type RecurringExpense = {
  id: string;
  description: string;
  price: string;
  frequency: Frequency;
  nextDate: string;
};

const FREQUENCIES: { value: Frequency; label: string }[] = [
  { value: "weekly", label: "Weekly" },
  { value: "fortnightly", label: "Fortnightly" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "annually", label: "Annually" },
];

const monthlyEquivalent: Record<Frequency, number> = {
  weekly: 52 / 12,
  fortnightly: 26 / 12,
  monthly: 1,
  quarterly: 1 / 3,
  annually: 1 / 12,
};

const emptyRow = (): RecurringExpense => ({
  id: crypto.randomUUID(),
  description: "",
  price: "",
  frequency: "monthly",
  nextDate: new Date().toISOString().split("T")[0],
});

export default function RecurringExpensesTable() {
  const [rows, setRows] = useState<RecurringExpense[]>([emptyRow()]);

  const update = (id: string, field: keyof RecurringExpense, value: string) => {
    setRows((prev) =>
      prev.map((row) => (row.id === id ? { ...row, [field]: value } : row))
    );
  };

  const addRow = () => setRows((prev) => [...prev, emptyRow()]);

  const deleteRow = (id: string) =>
    setRows((prev) => prev.filter((row) => row.id !== id));

  const monthlyTotal = rows.reduce((sum, row) => {
    const val = parseFloat(row.price);
    if (isNaN(val)) return sum;
    return sum + val * monthlyEquivalent[row.frequency];
  }, 0);

  const annualTotal = monthlyTotal * 12;

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-x-auto rounded-xl border border-gray-300">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-gray-500 uppercase text-xs tracking-wider">
              <th className="px-4 py-3 text-left font-medium w-[38%]">Expense</th>
              <th className="px-4 py-3 text-left font-medium w-[18%]">Price</th>
              <th className="px-4 py-3 text-left font-medium w-[18%]">Frequency</th>
              <th className="px-4 py-3 text-left font-medium w-[18%]">Paymnent Date</th>
              <th className="px-4 py-3 w-[8%]" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {rows.map((row) => (
              <tr key={row.id} className="group hover:bg-gray-50 transition-colors">
                <td className="px-4 py-2">
                  <input
                    type="text"
                    value={row.description}
                    onChange={(e) => update(row.id, "description", e.target.value)}
                    placeholder="Enter expense description"
                    className="w-full bg-transparent outline-none placeholder-gray-300 text-gray-700 focus:ring-0"
                  />
                </td>
                <td className="px-4 py-2">
                  <div className="flex items-center gap-1">
                    <span className="text-gray-400">$</span>
                    <input
                      type="number"
                      value={row.price}
                      onChange={(e) => update(row.id, "price", e.target.value)}
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                      className="w-full bg-transparent outline-none placeholder-gray-300 text-gray-700 focus:ring-0"
                    />
                  </div>
                </td>
                <td className="px-4 py-2">
                  <select
                    value={row.frequency}
                    onChange={(e) => update(row.id, "frequency", e.target.value)}
                    className="w-full bg-transparent outline-none text-gray-700 cursor-pointer"
                  >
                    {FREQUENCIES.map((f) => (
                      <option key={f.value} value={f.value}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-2">
                  <input
                    type="date"
                    value={row.nextDate}
                    onChange={(e) => update(row.id, "nextDate", e.target.value)}
                    className="w-full bg-transparent outline-none text-gray-700 focus:ring-0"
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

      <div>
        <button
          onClick={addRow}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-[#FC7118] transition-colors py-1 px-2 rounded-lg hover:bg-orange-50"
        >
          <span className="text-lg leading-none">+</span>
          Add row
        </button>
      </div>
    </div>
  );
}
