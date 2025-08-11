
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface DateSelectorProps {
  currentDate: Date;
  classId: number;
}

const DateSelector = ({ currentDate, classId }: DateSelectorProps) => {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState(
    currentDate.toISOString().split('T')[0]
  );

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = e.target.value;
    setSelectedDate(newDate);
    router.push(`/list/attendance/${classId}?date=${newDate}`);
  };

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="date-picker" className="text-sm font-medium text-gray-700">
        Date:
      </label>
      <input
        id="date-picker"
        type="date"
        value={selectedDate}
        onChange={handleDateChange}
        className="border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
    </div>
  );
};

export default DateSelector;
