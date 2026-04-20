"use client";

import { useState, useEffect } from "react";
import Image from "next/image";

type StaffMember = {
  id: string;
  name: string;
  surname: string;
  img: string | null;
  staffType: "teacher" | "admin" | "teacher-admin";
};

type Report = {
  id: string;
  subject: string;
  content: string;
  createdAt: string;
};

const ROLE_BADGE: Record<string, string> = {
  teacher: "bg-blue-100 text-blue-700",
  admin: "bg-gray-100 text-gray-600",
  "teacher-admin": "bg-orange-100 text-orange-700",
};

const ROLE_LABEL: Record<string, string> = {
  teacher: "Teacher",
  admin: "Admin",
  "teacher-admin": "Teacher-Admin",
};

export default function StaffReportsShell({ staff }: { staff: StaffMember[] }) {
  const [selected, setSelected] = useState<StaffMember | null>(staff[0] ?? null);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(false);
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!selected) return;
    setLoading(true);
    fetch(`/api/reports?staffId=${selected.id}`)
      .then(r => r.json())
      .then(data => setReports(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }, [selected]);

  const submit = async () => {
    if (!selected || !subject.trim() || !content.trim()) return;
    setSaving(true);
    const res = await fetch('/api/reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        staffId: selected.id,
        staffType: selected.staffType,
        subject: subject.trim(),
        content: content.trim(),
      }),
    });
    if (res.ok) {
      const saved = await res.json();
      setReports(prev => [saved, ...prev]);
      setSubject("");
      setContent("");
    }
    setSaving(false);
  };

  const deleteReport = async (id: string) => {
    await fetch(`/api/reports/${id}`, { method: 'DELETE' });
    setReports(prev => prev.filter(r => r.id !== id));
  };

  const filteredStaff = staff.filter(s =>
    `${s.name} ${s.surname}`.toLowerCase().includes(search.toLowerCase())
  );

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <div className="flex gap-0 h-[calc(100vh-160px)] rounded-xl border border-gray-200 overflow-hidden">
      {/* Left panel — staff list */}
      <div className="w-64 shrink-0 border-r border-gray-200 flex flex-col bg-gray-50">
        <div className="p-3 border-b border-gray-200">
          <input
            type="text"
            placeholder="Search staff…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full text-sm px-3 py-1.5 rounded-lg border border-gray-200 bg-white outline-none focus:border-orange-400"
          />
        </div>
        <div className="flex-1 overflow-y-auto">
          {filteredStaff.map(s => (
            <button
              key={s.id}
              onClick={() => setSelected(s)}
              className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors border-b border-gray-100 ${
                selected?.id === s.id
                  ? 'bg-orange-50 border-l-2 border-l-orange-400'
                  : 'hover:bg-white'
              }`}
            >
              <div className="relative w-8 h-8 shrink-0">
                <Image
                  src={s.img || '/noAvatar.png'}
                  alt=""
                  fill
                  className="rounded-full object-cover"
                />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{s.name} {s.surname}</p>
                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${ROLE_BADGE[s.staffType]}`}>
                  {ROLE_LABEL[s.staffType]}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Right panel — reports */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {selected ? (
          <>
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex items-center gap-3">
              <div className="relative w-9 h-9">
                <Image
                  src={selected.img || '/noAvatar.png'}
                  alt=""
                  fill
                  className="rounded-full object-cover"
                />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-gray-900">{selected.name} {selected.surname}</h2>
                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${ROLE_BADGE[selected.staffType]}`}>
                  {ROLE_LABEL[selected.staffType]}
                </span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {/* New report form */}
              <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">New Report</p>
                <input
                  type="text"
                  placeholder="Subject / Reason"
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  className="w-full text-sm px-3 py-2 rounded-lg border border-gray-200 outline-none focus:border-orange-400 mb-2 bg-white"
                />
                <textarea
                  placeholder="Write your report here…"
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  rows={4}
                  className="w-full text-sm px-3 py-2 rounded-lg border border-gray-200 outline-none focus:border-orange-400 resize-none bg-white"
                />
                <div className="flex justify-end mt-2">
                  <button
                    onClick={submit}
                    disabled={saving || !subject.trim() || !content.trim()}
                    className="px-4 py-1.5 bg-orange-500 text-white text-sm font-medium rounded-lg hover:bg-orange-600 disabled:opacity-50 transition-colors"
                  >
                    {saving ? 'Saving…' : 'Save Report'}
                  </button>
                </div>
              </div>

              {/* Existing reports */}
              <div className="px-6 py-4 space-y-4">
                {loading && <p className="text-sm text-gray-400">Loading…</p>}
                {!loading && reports.length === 0 && (
                  <p className="text-sm text-gray-400">No reports yet for {selected.name}.</p>
                )}
                {reports.map(r => (
                  <div key={r.id} className="group relative border border-gray-200 rounded-xl p-4 hover:border-gray-300 transition-colors">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div>
                        <p className="text-sm font-semibold text-gray-800">{r.subject}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{fmtDate(r.createdAt)}</p>
                      </div>
                      <button
                        onClick={() => deleteReport(r.id)}
                        className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 transition-all text-xs shrink-0"
                        title="Delete report"
                      >
                        ✕
                      </button>
                    </div>
                    <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">{r.content}</p>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-sm text-gray-400">
            Select a staff member to view reports
          </div>
        )}
      </div>
    </div>
  );
}
