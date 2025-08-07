
"use client";

import { useState, useEffect } from "react";

interface Teacher {
  id: string;
  name: string;
  surname: string;
  lessons: any[];
  subjects: any[];
  classes: any[];
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

  useEffect(() => {
    const calculatePayroll = async () => {
      try {
        // This would calculate based on actual data from Xero
        // For now, showing mock calculation based on lessons
        const hoursPerLesson = 1;
        const totalHours = teacher.lessons.length * hoursPerLesson * 4; // 4 weeks
        const hourlyRate = 50; // $50 per hour
        
        const mockPayroll: PayrollData = {
          baseSalary: 4000,
          hoursWorked: totalHours,
          overtimePay: Math.max(0, (totalHours - 40) * hourlyRate * 0.5),
          totalPay: 4000 + (totalHours * hourlyRate),
          deductions: 800, // taxes, etc.
          netPay: 4000 + (totalHours * hourlyRate) - 800
        };
        
        setPayroll(mockPayroll);
      } catch (error) {
        console.error("Error calculating payroll:", error);
      } finally {
        setLoading(false);
      }
    };

    calculatePayroll();
  }, [teacher]);

  if (loading) return <div>Loading payroll data...</div>;
  if (!payroll) return <div>No payroll data available</div>;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-blue-50 p-3 rounded">
          <h4 className="font-semibold text-blue-800">Base Salary</h4>
          <p className="text-xl font-bold text-blue-600">${payroll.baseSalary.toLocaleString()}</p>
        </div>
        <div className="bg-green-50 p-3 rounded">
          <h4 className="font-semibold text-green-800">Hours Worked</h4>
          <p className="text-xl font-bold text-green-600">{payroll.hoursWorked}</p>
        </div>
        <div className="bg-yellow-50 p-3 rounded">
          <h4 className="font-semibold text-yellow-800">Overtime Pay</h4>
          <p className="text-xl font-bold text-yellow-600">${payroll.overtimePay.toLocaleString()}</p>
        </div>
        <div className="bg-purple-50 p-3 rounded">
          <h4 className="font-semibold text-purple-800">Net Pay</h4>
          <p className="text-xl font-bold text-purple-600">${payroll.netPay.toLocaleString()}</p>
        </div>
      </div>
      
      <div className="border-t pt-4">
        <div className="flex justify-between text-sm text-gray-600">
          <span>Total Pay:</span>
          <span>${payroll.totalPay.toLocaleString()}</span>
        </div>
        <div className="flex justify-between text-sm text-gray-600">
          <span>Deductions:</span>
          <span>-${payroll.deductions.toLocaleString()}</span>
        </div>
        <div className="flex justify-between font-semibold border-t pt-2">
          <span>Net Pay:</span>
          <span>${payroll.netPay.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
};

export default PayrollSummary;
