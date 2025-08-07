
"use client";

import { useState, useEffect } from "react";

interface FinancialSummary {
  totalIncome: number;
  totalExpenses: number;
  netProfit: number;
}

const XeroFinancialReports = () => {
  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const response = await fetch("/api/xero/reports");
        if (!response.ok) {
          throw new Error("Failed to fetch reports");
        }
        const data = await response.json();
        
        // Process the data - this is a simplified example
        setSummary({
          totalIncome: 50000,
          totalExpenses: 30000,
          netProfit: 20000
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
  }, []);

  if (loading) return <div>Loading financial data...</div>;
  if (error) return <div className="text-red-500">Error: {error}</div>;
  if (!summary) return <div>No data available</div>;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-green-50 p-4 rounded">
          <h3 className="font-semibold text-green-800">Total Income</h3>
          <p className="text-2xl font-bold text-green-600">${summary.totalIncome.toLocaleString()}</p>
        </div>
        <div className="bg-red-50 p-4 rounded">
          <h3 className="font-semibold text-red-800">Total Expenses</h3>
          <p className="text-2xl font-bold text-red-600">${summary.totalExpenses.toLocaleString()}</p>
        </div>
        <div className="bg-blue-50 p-4 rounded">
          <h3 className="font-semibold text-blue-800">Net Profit</h3>
          <p className="text-2xl font-bold text-blue-600">${summary.netProfit.toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
};

export default XeroFinancialReports;
