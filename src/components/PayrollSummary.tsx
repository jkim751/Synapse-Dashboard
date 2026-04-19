"use client";

import { useState, useEffect } from "react";

interface Teacher {
  id: string;
  name: string;
  surname: string;
  xeroEmployeeId?: string | null;
}

interface PayslipEntry {
  payslipId: string;
  payPeriodStart: string;
  payPeriodEnd: string;
  netPay: number;
  wages: number;
}

const fmt = (n: number) =>
  new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(n);

const fmtPeriod = (start: string, end: string) => {
  const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" };
  const s = start ? new Date(start).toLocaleDateString("en-AU", opts) : "";
  const e = end ? new Date(end).toLocaleDateString("en-AU", opts) : "";
  return s && e ? `${s} – ${e}` : s || e || "—";
};

export default function PayrollSummary({
  teacher,
  targetId,
  personType,
}: {
  teacher: Teacher;
  targetId?: string;
  personType?: string;
}) {
  const [payslips, setPayslips] = useState<PayslipEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      setPayslips([]);
      try {
        let url = "/api/xero/payroll/list";
        if (targetId && personType) url += `?targetId=${targetId}&personType=${personType}`;
        else if (targetId) url += `?targetId=${targetId}`;

        const res = await fetch(url);
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Failed to load payslips");
        setPayslips(json.payslips ?? []);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [teacher, targetId, personType]);

  const download = async (payslipId: string, label: string) => {
    setDownloading(payslipId);
    try {
      const res = await fetch(`/api/xero/payroll/download?payslipId=${payslipId}`);
      if (!res.ok) throw new Error("Download failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `payslip-${label}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // silently ignore — retry available
    } finally {
      setDownloading(null);
    }
  };

  if (loading) return <p className="text-sm text-gray-500">Loading payslips…</p>;
  if (error) return <p className="text-sm text-red-500">Error: {error}</p>;
  if (payslips.length === 0) return <p className="text-sm text-gray-400">No payslips found in Xero.</p>;

  return (
    <div className="divide-y divide-gray-100">
      {payslips.map((p) => {
        const label = p.payPeriodEnd ? new Date(p.payPeriodEnd).toLocaleDateString("en-AU", { month: "short", year: "numeric" }) : p.payslipId;
        const isDownloading = downloading === p.payslipId;
        return (
          <div key={p.payslipId} className="flex items-center justify-between py-3 gap-4">
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-800 truncate">{fmtPeriod(p.payPeriodStart, p.payPeriodEnd)}</p>
              <p className="text-xs text-gray-400 mt-0.5">Gross {fmt(p.wages)} · Net {fmt(p.netPay)}</p>
            </div>
            <button
              onClick={() => download(p.payslipId, label)}
              disabled={isDownloading}
              className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              {isDownloading ? (
                <div className="w-3.5 h-3.5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              )}
              {isDownloading ? "…" : "PDF"}
            </button>
          </div>
        );
      })}
    </div>
  );
}
