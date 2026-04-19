"use client";

import { useState } from "react";
import ExpensesTable from "@/components/ExpensesTable";
import RecurringExpensesTable from "@/components/RecurringExpensesTable";

type Tab = "one-off" | "recurring";

export default function ExpensesShell({ role }: { role: string }) {
  const [tab, setTab] = useState<Tab>("one-off");

  const tabs: { id: Tab; label: string }[] = [
    { id: "one-off", label: "Expenses" },
    ...(role === "director" ? [{ id: "recurring" as Tab, label: "Recurring" }] : []),
  ];

  return (
    <div className="bg-white rounded-xl shadow">
      {/* Tab bar */}
      <div className="flex border-b border-gray-200 px-6 pt-4 gap-6">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
              tab === t.id
                ? "border-[#FC7118] text-[#FC7118]"
                : "border-transparent text-gray-400 hover:text-gray-600"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-6">
        {tab === "one-off" && <ExpensesTable />}
        {tab === "recurring" && role === "director" && <RecurringExpensesTable />}
      </div>
    </div>
  );
}
