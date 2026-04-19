"use client";

import { useState } from "react";
import PayrollSummary from "./PayrollSummary";

export type PersonOption = {
  id: string;
  name: string;
  surname: string;
  personType: "teacher" | "admin";
};

type Props = {
  role: string;
  people: PersonOption[];
  defaultPersonId: string;
};

export default function PayrollView({ role, people, defaultPersonId }: Props) {
  const isDirector = role === "director";
  const [selectedId, setSelectedId] = useState(defaultPersonId);

  const selected = people.find((p) => p.id === selectedId) ?? people[0];

  // Log hours form state
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [hours, setHours] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [logResult, setLogResult] = useState<{ ok: boolean; message: string } | null>(null);

  const handleLogHours = async () => {
    const h = parseFloat(hours);
    if (!date || isNaN(h) || h <= 0 || h > 24) {
      setLogResult({ ok: false, message: "Enter a valid date and hours (0–24)" });
      return;
    }
    setSubmitting(true);
    setLogResult(null);
    try {
      const res = await fetch("/api/xero/log-hours", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetId: isDirector ? selectedId : undefined,
          personType: isDirector ? selected?.personType : undefined,
          date,
          hours: h,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setLogResult({ ok: false, message: json.error ?? "Failed to log hours" });
      } else {
        setLogResult({ ok: true, message: `${h} hr${h !== 1 ? "s" : ""} logged to Xero for ${date}` });
        setHours("");
      }
    } catch {
      setLogResult({ ok: false, message: "An unexpected error occurred" });
    } finally {
      setSubmitting(false);
    }
  };

  const teachers = people.filter((p) => p.personType === "teacher");
  const admins = people.filter((p) => p.personType === "admin");

  return (
    <div className="flex flex-col gap-6">
      {/* Person selector — director only */}
      {isDirector && people.length > 1 && (
        <div className="bg-white rounded-xl p-4 shadow-sm flex items-center gap-4">
          <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Viewing:</label>
          <select
            value={selectedId}
            onChange={(e) => { setSelectedId(e.target.value); setLogResult(null); }}
            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
          >
            {teachers.length > 0 && (
              <optgroup label="Teachers">
                {teachers.map((p) => (
                  <option key={p.id} value={p.id}>{p.name} {p.surname}</option>
                ))}
              </optgroup>
            )}
            {admins.length > 0 && (
              <optgroup label="Admins">
                {admins.map((p) => (
                  <option key={p.id} value={p.id}>{p.name} {p.surname}</option>
                ))}
              </optgroup>
            )}
          </select>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payslip panel */}
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h2 className="text-base font-semibold text-gray-800 mb-1">Latest Payslip</h2>
          {selected && (
            <p className="text-sm text-gray-400 mb-4">{selected.name} {selected.surname}</p>
          )}
          <PayrollSummary
            teacher={selected ?? { id: selectedId, name: "", surname: "" }}
            targetId={isDirector ? selectedId : undefined}
            personType={isDirector ? selected?.personType : undefined}
          />
        </div>

        {/* Log hours panel */}
        <div className="bg-white rounded-xl p-6 shadow-sm flex flex-col gap-5">
          <div>
            <h2 className="text-base font-semibold text-gray-800 mb-1">Log Hours to Xero</h2>
            <p className="text-sm text-gray-400">
              Submits a draft timesheet entry for{" "}
              {isDirector && selected ? `${selected.name} ${selected.surname}` : "you"}.
            </p>
          </div>

          <div className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Hours worked</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0.5"
                  max="24"
                  step="0.5"
                  value={hours}
                  onChange={(e) => setHours(e.target.value)}
                  placeholder="e.g. 7.5"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
                <span className="text-sm text-gray-400 whitespace-nowrap">hrs</span>
              </div>
            </div>
          </div>

          {logResult && (
            <div className={`rounded-lg px-4 py-3 text-sm ${logResult.ok ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
              {logResult.message}
            </div>
          )}

          <button
            onClick={handleLogHours}
            disabled={submitting}
            className="mt-auto w-full py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {submitting && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            {submitting ? "Submitting…" : "Submit to Xero"}
          </button>

          <p className="text-xs text-gray-400">
            Hours are submitted as a draft timesheet. Review and approve in Xero Payroll before processing.
          </p>
        </div>
      </div>
    </div>
  );
}
