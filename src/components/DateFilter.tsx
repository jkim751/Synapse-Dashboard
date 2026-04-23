"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";

interface DateFilterProps {
  currentDate: Date;
}

const DateFilter = ({ currentDate }: DateFilterProps) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const formatDate = (date: Date) => date.toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(formatDate(currentDate));

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = e.target.value;
    setSelectedDate(newDate);
    const params = new URLSearchParams(searchParams);
    params.set('date', newDate);
    params.delete('page');
    startTransition(() => {
      router.push(`?${params.toString()}`);
    });
  };

  return (
    <div className="flex items-center gap-2">
      <label className="text-sm font-medium text-gray-700">Date:</label>
      <div className="relative">
        <input
          type="date"
          value={selectedDate}
          onChange={handleChange}
          disabled={isPending}
          className={`border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 transition-opacity ${isPending ? "opacity-50" : ""}`}
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

export default DateFilter;
