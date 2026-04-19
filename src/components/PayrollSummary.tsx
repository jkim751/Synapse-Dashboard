"use client";

import { useState, useEffect } from "react";

interface Teacher {
  id: string;
  name: string;
  surname: string;
  xeroEmployeeId?: string | null;
}

interface PayrollData {
  baseSalary: number;
  hoursWorked: number;
  overtimePay: number;
  totalPay: number;
  deductions: number;
  netPay: number;
  payPeriodStart: string | null;
  payPeriodEnd: string | null;
}

const fmt = (amount: number) =>
  new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(amount);

const PayrollSummary = ({ teacher, targetId, personType }: { teacher: Teacher; targetId?: string; personType?: string }) => {
  const [payroll, setPayroll] = useState<PayrollData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  if (loading) return <div className="text-sm text-gray-500">Loading payroll data…</div>;
  if (error) return <div className="text-sm text-red-500">Error: {error}</div>;
  if (!payroll) return <div className="text-sm text-gray-500">No payroll data available.</div>;

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
    <div className="space-y-4">
      <p className="text-xs text-gray-400">Pay period: {periodLabel}</p>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg bg-blue-50 p-3">
          <p className="text-xs font-medium text-blue-700">Base Salary</p>
          <p className="text-lg font-bold text-blue-900">{fmt(payroll.baseSalary)}</p>
        </div>
        <div className="rounded-lg bg-indigo-50 p-3">
          <p className="text-xs font-medium text-indigo-700">Hours Worked</p>
          <p className="text-lg font-bold text-indigo-900">{payroll.hoursWorked} hrs</p>
        </div>
        <div className="rounded-lg bg-orange-50 p-3">
          <p className="text-xs font-medium text-orange-700">Overtime</p>
          <p className="text-lg font-bold text-orange-900">{fmt(payroll.overtimePay)}</p>
        </div>
        <div className="rounded-lg bg-red-50 p-3">
          <p className="text-xs font-medium text-red-700">Deductions</p>
          <p className="text-lg font-bold text-red-900">−{fmt(payroll.deductions)}</p>
        </div>
      </div>

      <div className="rounded-lg border-2 border-green-200 bg-green-50 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-green-700">Gross Pay</p>
            <p className="text-sm text-green-600">{fmt(payroll.totalPay)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-medium text-green-700">Net Pay</p>
            <p className="text-2xl font-bold text-green-900">{fmt(payroll.netPay)}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PayrollSummary;
