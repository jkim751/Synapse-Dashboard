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

  const download = (payslipId: string) => {
    window.open(`/api/xero/payroll/download?payslipId=${payslipId}`, "_blank");
  };

  if (loading) return <p className="text-sm text-gray-500">Loading payslips…</p>;
  if (error) return <p className="text-sm text-red-500">Error: {error}</p>;
  if (payslips.length === 0) return <p className="text-sm text-gray-400">No payslips found in Xero.</p>;

  return (
    <div className="divide-y divide-gray-100">
      {payslips.map((p) => {
        return (
          <div key={p.payslipId} className="flex items-center justify-between py-3 gap-4">
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-800 truncate">{fmtPeriod(p.payPeriodStart, p.payPeriodEnd)}</p>
              <p className="text-xs text-gray-400 mt-0.5">Gross {fmt(p.wages)} · Net {fmt(p.netPay)}</p>
            </div>
            <button
              onClick={() => download(p.payslipId)}
              className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              View
            </button>
          </div>
        );
      })}
    </div>
  );
}
