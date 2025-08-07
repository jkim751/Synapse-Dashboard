
"use client";

import { useRouter, useSearchParams } from "next/navigation";

interface DateFilterProps {
  fromDate: Date;
  toDate: Date;
}

const DateFilter = ({ fromDate, toDate }: DateFilterProps) => {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleFromDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const params = new URLSearchParams(searchParams);
    params.set('from', e.target.value);
    router.push(`?${params.toString()}`);
  };

  const handleToDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const params = new URLSearchParams(searchParams);
    params.set('to', e.target.value);
    router.push(`?${params.toString()}`);
  };

  return (
    <div className="flex items-center gap-2">
      <label className="text-sm font-medium text-gray-700">From:</label>
      <input
        type="date"
        value={fromDate.toISOString().split('T')[0]}
        onChange={handleFromDateChange}
        className="border border-gray-300 rounded px-2 py-1 text-sm"
      />
      <label className="text-sm font-medium text-gray-700">To:</label>
      <input
        type="date"
        value={toDate.toISOString().split('T')[0]}
        onChange={handleToDateChange}
        className="border border-gray-300 rounded px-2 py-1 text-sm"
      />
    </div>
  );
};

export default DateFilter;
