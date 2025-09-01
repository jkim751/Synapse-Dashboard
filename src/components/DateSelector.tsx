"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

interface DateSelectorProps {
  currentDate: Date;
  classId: number;
}

const DateSelector = ({ currentDate, classId }: DateSelectorProps) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Format date for input (YYYY-MM-DD)
  const formatDateForInput = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  const [selectedDate, setSelectedDate] = useState(formatDateForInput(currentDate));

  // Update local state when currentDate prop changes
  useEffect(() => {
    setSelectedDate(formatDateForInput(currentDate));
  }, [currentDate]);

  const handleDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = event.target.value;
    setSelectedDate(newDate);
    
    // Create new URL with updated date
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.set('date', newDate);
    
    // Navigate to new URL
    router.push(`/list/attendance/${classId}?${newSearchParams.toString()}`);
  };

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="date-selector" className="text-sm font-medium text-gray-700">
        Date:
      </label>
      <input
        id="date-selector"
        type="date"
        value={selectedDate}
        onChange={handleDateChange}
        className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  );
};

export default DateSelector;
