"use client";

import { useState, useEffect } from "react";

interface Invoice {
  id: string;
  invoiceNumber: string;
  total: number;
  amountDue: number;
  amountPaid: number;
  dueDate: string | null;
  status: string;
  description: string;
}

function getDisplayStatus(inv: Invoice): { label: string; className: string } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (inv.status === "PAID" || inv.amountDue === 0) {
    return { label: "Paid", className: "bg-green-100 text-green-800" };
  }
  if (inv.status === "VOIDED") {
    return { label: "Voided", className: "bg-gray-100 text-gray-500" };
  }
  if (inv.status === "DRAFT") {
    return { label: "Draft", className: "bg-blue-100 text-blue-800" };
  }
  if (inv.status === "AUTHORISED" && inv.amountDue > 0) {
    const isOverdue = inv.dueDate && new Date(inv.dueDate) < today;
    return isOverdue
      ? { label: "Overdue", className: "bg-red-100 text-red-700" }
      : { label: "Due", className: "bg-yellow-100 text-yellow-800" };
  }
  return { label: inv.status, className: "bg-gray-100 text-gray-600" };
}

const InvoicesList = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchInvoices = async () => {
      try {
        const response = await fetch("/api/xero/invoices");
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Failed to fetch invoices.");
        }
        const data: Invoice[] = await response.json();
        setInvoices(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchInvoices();
  }, []);

  if (loading) return <div className="text-sm text-gray-500">Loading invoices…</div>;
  if (error) return <div className="text-sm text-red-500">Error: {error}</div>;
  if (invoices.length === 0)
    return <p className="text-sm text-gray-500">No invoices found for your account.</p>;

  const totalOutstanding = invoices
    .filter(inv => inv.status !== "VOIDED" && inv.status !== "DRAFT")
    .reduce((sum, inv) => sum + inv.amountDue, 0);

  return (
    <div className="space-y-4">
      {totalOutstanding > 0 && (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 flex items-center justify-between">
          <span className="text-sm font-medium text-yellow-800">Outstanding balance</span>
          <span className="text-lg font-bold text-yellow-900">${totalOutstanding.toFixed(2)}</span>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b text-left text-gray-500">
              <th className="pb-2 pr-4 font-medium">Invoice #</th>
              <th className="pb-2 pr-4 font-medium">Description</th>
              <th className="pb-2 pr-4 font-medium text-right">Total</th>
              <th className="pb-2 pr-4 font-medium text-right">Amount Due</th>
              <th className="pb-2 pr-4 font-medium">Due Date</th>
              <th className="pb-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map(inv => {
              const { label, className } = getDisplayStatus(inv);
              return (
                <tr key={inv.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="py-2 pr-4 font-mono text-xs">{inv.invoiceNumber || "—"}</td>
                  <td className="py-2 pr-4 text-gray-700">{inv.description}</td>
                  <td className="py-2 pr-4 text-right">${inv.total.toFixed(2)}</td>
                  <td className="py-2 pr-4 text-right font-semibold">
                    {inv.amountDue > 0 ? `$${inv.amountDue.toFixed(2)}` : "—"}
                  </td>
                  <td className="py-2 pr-4 text-gray-600">
                    {inv.dueDate
                      ? new Date(inv.dueDate).toLocaleDateString("en-AU", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })
                      : "—"}
                  </td>
                  <td className="py-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${className}`}>
                      {label}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default InvoicesList;
