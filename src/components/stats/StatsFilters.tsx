"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import Image from "next/image";

interface StatsFiltersProps {
  searchParams: { [key: string]: string | undefined };
}

const StatsFilters = ({ searchParams }: StatsFiltersProps) => {
  const router = useRouter();
  const urlSearchParams = useSearchParams();
  
  const [startDate, setStartDate] = useState(
    searchParams.startDate || new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState(
    searchParams.endDate || new Date().toISOString().split('T')[0]
  );

  const handleDateChange = () => {
    const params = new URLSearchParams(urlSearchParams);
    
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);

    router.push(`/list/stats?${params.toString()}`);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-m font-semibold">Time Period</h2>
      </div>
      
      <div className="flex flex-col md:flex-row gap-4 md:gap-2 text-xs">
        {/* Start Date */}
        <div className="flex items-center gap-2 rounded-full ring-[1.5px] ring-gray-300 px-2">
          <Image src="/calendar.png" alt="" width={14} height={14} />
          <input
            type="date"
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value);
              setTimeout(handleDateChange, 100);
            }}
            placeholder="Start Date"
            className="w-[200px] p-2 bg-transparent outline-none"
          />
        </div>

        {/* End Date */}
        <div className="flex items-center gap-2 rounded-full ring-[1.5px] ring-gray-300 px-2">
          <Image src="/calendar.png" alt="" width={14} height={14} />
          <input
            type="date"
            value={endDate}
            onChange={(e) => {
              setEndDate(e.target.value);
              setTimeout(handleDateChange, 100);
            }}
            placeholder="End Date"
            className="w-[200px] p-2 bg-transparent outline-none"
          />
        </div>
      </div>
    </div>
  );
};

export default StatsFilters;
