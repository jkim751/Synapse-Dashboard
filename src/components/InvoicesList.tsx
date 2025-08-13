"use client";

import { useState, useEffect } from "react";

// The interfaces remain the same
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
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // This function will now fetch REAL invoices
    const fetchInvoices = async () => {
      // 1. Get only the valid Xero Contact IDs from the students prop
      const contactIDs = students
        .map(s => s.xeroContactId)
        .filter((id): id is string => id !== null);

      // If no students are synced with Xero yet, don't make an API call
      if (contactIDs.length === 0) {
        setLoading(false);
        return;
      }

      try {
        // 2. Call our new backend API route
        const response = await fetch('/api/xero/invoices', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contactIDs }),
        });

        if (!response.ok) {
          throw new Error('Failed to fetch invoices from the server.');
        }

        const data = await response.json();
        setInvoices(data);

      } catch (err: any) {
        console.error("Error fetching invoices:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchInvoices();
  }, [students]); // 3. The effect depends on the list of students

  if (loading) return <div>Loading invoices...</div>;
  if (error) return <div className="text-red-500">Error: {error}</div>;

  return (
    // Your JSX for rendering the table remains exactly the same. It's already perfect!
    <div className="space-y-4">
      {invoices.length === 0 ? (
        <p className="text-gray-500">No invoices found for your children.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full table-auto">
            {/* ... your table JSX ... */}
          </table>
        </div>
      )}
    </div>
  );
};

export default InvoicesList;