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

  if (loading) return <p className="text-sm text-gray-500">Loading payslips…</p>;
  if (error) return <p className="text-sm text-red-500">Error: {error}</p>;
  if (payslips.length === 0) return <p className="text-sm text-gray-400">No payslips found in Xero.</p>;

  return (
    <div className="divide-y divide-gray-100">
      {payslips.map((p) => (
        <div key={p.payslipId} className="flex items-center justify-between py-3 gap-4">
          <p className="text-sm font-medium text-gray-700">{fmtPeriod(p.payPeriodStart, p.payPeriodEnd)}</p>
          <div className="flex gap-4 text-sm text-right">
            <span className="text-gray-500">Gross <span className="font-semibold text-gray-800">{fmt(p.wages)}</span></span>
            <span className="text-gray-500">Net <span className="font-semibold text-green-600">{fmt(p.netPay)}</span></span>
          </div>
        </div>
      ))}
    </div>
  );
}
