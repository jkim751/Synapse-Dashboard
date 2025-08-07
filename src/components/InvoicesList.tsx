
"use client";

import { useState, useEffect } from "react";

interface Student {
  id: string;
  name: string;
  surname: string;
  xeroContactId: string | null;
}

interface Invoice {
  id: string;
  studentName: string;
  amount: number;
  dueDate: string;
  status: string;
  description: string;
}

const InvoicesList = ({ students }: { students: Student[] }) => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInvoices = async () => {
      try {
        // This would fetch actual invoices from Xero
        // For now, showing mock data
        const mockInvoices: Invoice[] = [
          {
            id: "1",
            studentName: "John Doe",
            amount: 500,
            dueDate: "2024-01-15",
            status: "AUTHORISED",
            description: "School Fees - January 2024"
          },
          {
            id: "2",
            studentName: "Jane Doe",
            amount: 500,
            dueDate: "2024-01-15",
            status: "PAID",
            description: "School Fees - January 2024"
          }
        ];
        setInvoices(mockInvoices);
      } catch (error) {
        console.error("Error fetching invoices:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchInvoices();
  }, [students]);

  if (loading) return <div>Loading invoices...</div>;

  return (
    <div className="space-y-4">
      {invoices.length === 0 ? (
        <p className="text-gray-500">No invoices found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full table-auto">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-4 py-2 text-left">Student</th>
                <th className="px-4 py-2 text-left">Description</th>
                <th className="px-4 py-2 text-left">Amount</th>
                <th className="px-4 py-2 text-left">Due Date</th>
                <th className="px-4 py-2 text-left">Status</th>
                <th className="px-4 py-2 text-left">Action</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((invoice) => (
                <tr key={invoice.id} className="border-b">
                  <td className="px-4 py-2">{invoice.studentName}</td>
                  <td className="px-4 py-2">{invoice.description}</td>
                  <td className="px-4 py-2">${invoice.amount}</td>
                  <td className="px-4 py-2">{invoice.dueDate}</td>
                  <td className="px-4 py-2">
                    <span className={`px-2 py-1 rounded text-s ${
                      invoice.status === 'PAID' 
                        ? 'bg-green-100 text-green-800' 
                        : invoice.status === 'AUTHORISED'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {invoice.status}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    {invoice.status === 'AUTHORISED' && (
                      <button className="bg-orange-400 text-white px-3 py-1 rounded text-s hover:bg-blue-400">
                        Pay Now
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default InvoicesList;
