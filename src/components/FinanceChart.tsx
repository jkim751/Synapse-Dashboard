
"use client";

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { useEffect, useState } from "react";
import Image from "next/image";

interface FinanceData {
  name: string;
  income: number;
  expense: number;
}

const FinanceChart = () => {
  const [data, setData] = useState<FinanceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFinanceData = async () => {
      try {
        const response = await fetch('/api/xero/reports');
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch chart data');
        }

        // --- THIS IS THE FIX ---
        // We now use the real chartData from the API response
        const xeroData = await response.json();
        setData(xeroData.chartData);

      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchFinanceData();
  }, []);

  // We no longer need the local `transformXeroData` function.

  if (loading) {
    return (
      <div className="bg-white rounded-xl w-full h-full p-4 flex items-center justify-center">
        <div>Loading financial chart...</div>
      </div>
    );
  }

  if (error) {
    return <div className="text-red-500 p-4">Error loading chart: {error}</div>;
  }
  

  return (
    <div className="bg-white rounded-xl w-full h-full p-4">
      <div className="flex justify-between items-center">
        <h1 className="text-lg font-semibold">Finance (Xero)</h1>
        <Image src="/moreDark.png" alt="" width={20} height={20} />
      </div>
      <ResponsiveContainer width="100%" height="90%">
        <LineChart
          width={500}
          height={300}
          data={data}
          margin={{
            top: 5,
            right: 30,
            left: 20,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#ddd" />
          <XAxis
            dataKey="name"
            axisLine={false}
            tick={{ fill: "#d1d5db" }}
            tickLine={false}
            tickMargin={10}
          />
          <YAxis axisLine={false} tick={{ fill: "#d1d5db" }} tickLine={false} tickMargin={20}/>
          <Tooltip />
          <Legend
            align="center"
            verticalAlign="top"
            wrapperStyle={{ paddingTop: "10px", paddingBottom: "30px" }}
          />
          <Line
            type="monotone"
            dataKey="income"
            stroke="#FFA500"
            strokeWidth={5}
          />
          <Line type="monotone" dataKey="expense" stroke="#FF7F50" strokeWidth={5}/>
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default FinanceChart;
