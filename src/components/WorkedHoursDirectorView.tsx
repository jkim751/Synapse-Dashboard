"use client";

import { useState, useEffect } from "react";
import WorkedHoursTable, { HoursEntry } from "./WorkedHoursTable";

type Person = { id: string; name: string; surname: string; role: "teacher" | "teacher-admin" };

export default function WorkedHoursDirectorView({ people }: { people: Person[] }) {
  const [selectedId, setSelectedId] = useState(people[0]?.id ?? "");
  const [entries, setEntries] = useState<HoursEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selectedId) return;
    setLoading(true);
    fetch(`/api/hours?teacherId=${selectedId}`)
      .then((r) => r.json())
      .then((data: HoursEntry[]) => setEntries(data))
      .finally(() => setLoading(false));
  }, [selectedId]);

  const teachers = people.filter((p) => p.role === "teacher");
  const teacherAdmins = people.filter((p) => p.role === "teacher-admin");

  const totalHours = entries.reduce((sum, e) => sum + e.hoursWorked, 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4 flex-wrap">
        <label className="text-sm text-gray-500 font-medium">Viewing hours for:</label>
        <select
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          className="ring-[1.5px] ring-gray-300 p-2 rounded-xl text-sm focus:outline-none focus:ring-orange-400"
        >
          {teachers.length > 0 && (
            <optgroup label="Teachers">
              {teachers.map((p) => (
                <option key={p.id} value={p.id}>{p.name} {p.surname}</option>
              ))}
            </optgroup>
          )}
          {teacherAdmins.length > 0 && (
            <optgroup label="Teacher-Admins">
              {teacherAdmins.map((p) => (
                <option key={p.id} value={p.id}>{p.name} {p.surname}</option>
              ))}
            </optgroup>
          )}
        </select>
        {!loading && entries.length > 0 && (
          <span className="text-sm text-gray-400">
            {entries.length} entr{entries.length === 1 ? "y" : "ies"} · {totalHours}h total
          </span>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-gray-400">Loading…</p>
      ) : (
        <WorkedHoursTable key={selectedId} initialEntries={entries} readOnly />
      )}
    </div>
  );
}
