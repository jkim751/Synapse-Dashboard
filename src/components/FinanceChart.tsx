
"use client";

import Image from "next/image";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { useEffect, useState } from "react";

interface FinanceData {
  name: string;
  income: number;
  expense: number;
}

const FinanceChart = () => {
  const [data, setData] = useState<FinanceData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFinanceData = async () => {
      try {
        const response = await fetch('/api/xero/reports');
        const xeroData = await response.json();
        
        // Transform Xero data into chart format
        // This is a simplified transformation - you'll need to adapt based on your Xero data structure
        const chartData = transformXeroData(xeroData);
        setData(chartData);
      } catch (error) {
        console.error('Error fetching finance data:', error);
        // Fallback to mock data
        setData([
          { name: "Jan", income: 4000, expense: 2400 },
          { name: "Feb", income: 3000, expense: 1398 },
          { name: "Mar", income: 2000, expense: 9800 },
          { name: "Apr", income: 2780, expense: 3908 },
          { name: "May", income: 1890, expense: 4800 },
          { name: "Jun", income: 2390, expense: 3800 },
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchFinanceData();
  }, []);

  const transformXeroData = (xeroData: any): FinanceData[] => {
    // Transform Xero report data into your chart format
    // This is a placeholder - implement based on your Xero report structure
    return [
      { name: "Jan", income: 4000, expense: 2400 },
      { name: "Feb", income: 3000, expense: 1398 },
      // ... transform actual Xero data here
    ];
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl w-full h-full p-4 flex items-center justify-center">
        <div>Loading financial data...</div>
      </div>
    );
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
