"use client";

import { useState, useEffect } from "react";

interface Teacher {
  id: string;
  name: string;
  surname: string;
  xeroEmployeeId?: string | null;
}

interface PayrollData {
  payslipId: string | null;
  netPay: number;
  totalPay: number;
  payPeriodStart: string | null;
  payPeriodEnd: string | null;
}

const fmt = (amount: number) =>
  new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(amount);

const PayrollSummary = ({ teacher, targetId, personType }: { teacher: Teacher; targetId?: string; personType?: string }) => {
  const [payroll, setPayroll] = useState<PayrollData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    const fetchPayroll = async () => {
      setLoading(true);
      setError(null);
      setPayroll(null);
      try {
        let url = '/api/xero/payroll';
        if (targetId && personType) {
          url = `/api/xero/payroll?targetId=${targetId}&personType=${personType}`;
        } else if (targetId) {
          url = `/api/xero/payroll?targetId=${targetId}`;
        }
        const response = await fetch(url);
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Failed to fetch payroll data.");
        }
        const data: PayrollData = await response.json();
        setPayroll(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchPayroll();
  }, [teacher, targetId, personType]);

  const handleDownload = async () => {
    if (!payroll?.payslipId) return;
    setDownloading(true);
    try {
      const res = await fetch(`/api/xero/payroll/download?payslipId=${payroll.payslipId}`);
      if (!res.ok) throw new Error("Download failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "payslip.pdf";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // silently fail — user can retry
    } finally {
      setDownloading(false);
    }
  };

  if (loading) return <div className="text-sm text-gray-500">Loading payslip…</div>;
  if (error) return <div className="text-sm text-red-500">Error: {error}</div>;
  if (!payroll) return <div className="text-sm text-gray-500">No payslip available.</div>;

  const periodLabel =
    payroll.payPeriodStart && payroll.payPeriodEnd
      ? `${new Date(payroll.payPeriodStart).toLocaleDateString("en-AU", {
          day: "numeric",
          month: "short",
        })} – ${new Date(payroll.payPeriodEnd).toLocaleDateString("en-AU", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })}`
      : "Most recent pay run";

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-lg border border-gray-100 bg-gray-50 px-4 py-3 text-sm text-gray-500">
        Pay period: <span className="font-medium text-gray-700">{periodLabel}</span>
      </div>

      <div className="rounded-lg border-2 border-green-200 bg-green-50 p-5 flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-green-700">Gross Pay</p>
          <p className="text-sm text-green-600 mb-3">{fmt(payroll.totalPay)}</p>
          <p className="text-xs font-medium text-green-700">Net Pay</p>
          <p className="text-2xl font-bold text-green-900">{fmt(payroll.netPay)}</p>
        </div>
      </div>

      {payroll.payslipId && (
        <button
          onClick={handleDownload}
          disabled={downloading}
          className="w-full py-2.5 border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {downloading ? (
            <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          )}
          {downloading ? "Preparing…" : "Download Payslip"}
        </button>
      )}
    </div>
  );
};

export default PayrollSummary;
