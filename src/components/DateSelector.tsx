"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";

interface DateSelectorProps {
  currentDate: Date;
  classId: number;
}

const DateSelector = ({ currentDate, classId }: DateSelectorProps) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const formatDateForInput = (date: Date) => date.toISOString().split('T')[0];

  const [selectedDate, setSelectedDate] = useState(formatDateForInput(currentDate));

  useEffect(() => {
    setSelectedDate(formatDateForInput(currentDate));
  }, [currentDate]);

  const handleDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = event.target.value;
    setSelectedDate(newDate);

    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.set('date', newDate);

    startTransition(() => {
      router.push(`/list/attendance/${classId}?${newSearchParams.toString()}`);
    });
  };

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="date-selector" className="text-sm font-medium text-gray-700">
        Date:
      </label>
      <div className="relative">
        <input
          id="date-selector"
          type="date"
          value={selectedDate}
          onChange={handleDateChange}
          disabled={isPending}
          className={`px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 transition-opacity ${isPending ? "opacity-50" : ""}`}
        />
        {isPending && (
          <div className="absolute inset-y-0 right-2 flex items-center pointer-events-none">
            <div className="h-4 w-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>
    </div>
  );
};

export default DateSelector;
