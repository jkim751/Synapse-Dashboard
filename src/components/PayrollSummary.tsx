"use client";

import { useState, useEffect } from "react";

// The Teacher interface now includes the optional xeroEmployeeId
interface Teacher {
  id: string;
  name: string;
  surname: string;
  xeroEmployeeId?: string | null; // Optional
}

interface PayrollData {
  baseSalary: number;
  hoursWorked: number;
  overtimePay: number;
  totalPay: number;
  deductions: number;
  netPay: number;
}

const PayrollSummary = ({ teacher }: { teacher: Teacher }) => {
  const [payroll, setPayroll] = useState<PayrollData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPayroll = async () => {
      // If the teacher isn't synced to Xero Payroll, we can't fetch data.
      if (!teacher.xeroEmployeeId) {
        setError("This teacher is not yet synced with Xero Payroll.");
        setLoading(false);
        return;
      }

      try {
        const response = await fetch("/api/xero/payroll");

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Failed to fetch payroll data.");
        }

        const data: PayrollData = await response.json();
        setPayroll(data);

      } catch (err: any) {
        console.error("Error fetching payroll:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchPayroll();
  }, [teacher]); // Re-run if the teacher prop changes

  if (loading) return <div>Loading payroll data...</div>;
  if (error) return <div className="text-red-500">Error: {error}</div>;
  if (!payroll) return <div>No payroll data is currently available.</div>;

  return (
    // Your display JSX remains the same, it will now show the real data.
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-blue-50 p-3 rounded">
          <h4 className="font-semibold text-blue-800">Base Salary</h4>
          <p className="text-xl font-bold text-blue-600">${payroll.baseSalary.toLocaleString()}</p>
        </div>
        {/* ... other data divs ... */}
        <div className="bg-purple-50 p-3 rounded">
          <h4 className="font-semibold text-purple-800">Net Pay</h4>
          <p className="text-xl font-bold text-purple-600">${payroll.netPay.toLocaleString()}</p>
        </div>
      </div>
      
      <div className="border-t pt-4">
        {/* ... summary section ... */}
      </div>
    </div>
  );
};

export default PayrollSummary;