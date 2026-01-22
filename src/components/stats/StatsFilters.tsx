"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import Image from "next/image";

interface StatsFiltersProps {
  searchParams: { [key: string]: string | undefined };
}

interface Grade {
  id: number;
  level: number;
}

interface Subject {
  id: number;
  name: string;
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
  const [selectedGrade, setSelectedGrade] = useState(searchParams.gradeId || "");
  const [selectedSubject, setSelectedSubject] = useState(searchParams.subjectId || "");
  const [grades, setGrades] = useState<Grade[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);

  useEffect(() => {
    fetchGrades();
    fetchSubjects();
  }, []);

  const fetchGrades = async () => {
    try {
      const response = await fetch('/api/grades');
      if (response.ok) {
        const data = await response.json();
        setGrades(data);
      }
    } catch (error) {
      console.error('Failed to fetch grades:', error);
    }
  };

  const fetchSubjects = async () => {
    try {
      const response = await fetch('/api/subjects');
      if (response.ok) {
        const data = await response.json();
        setSubjects(data);
      }
    } catch (error) {
      console.error('Failed to fetch subjects:', error);
    }
  };

  const handleFilterChange = () => {
    const params = new URLSearchParams(urlSearchParams);
    
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);
    if (selectedGrade) params.set("gradeId", selectedGrade);
    else params.delete("gradeId");
    if (selectedSubject) params.set("subjectId", selectedSubject);
    else params.delete("subjectId");

    router.push(`/list/stats?${params.toString()}`);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-m font-semibold">Filters</h2>
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
              setTimeout(handleFilterChange, 100);
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
              setTimeout(handleFilterChange, 100);
            }}
            placeholder="End Date"
            className="w-[200px] p-2 bg-transparent outline-none"
          />
        </div>

        {/* Grade Filter */}
        <div className="flex items-center gap-2 rounded-full ring-[1.5px] ring-gray-300 px-2">
          <Image src="/filter.png" alt="" width={14} height={14} />
          <select
            value={selectedGrade}
            onChange={(e) => {
              setSelectedGrade(e.target.value);
              setTimeout(handleFilterChange, 100);
            }}
            className="w-[150px] p-2 bg-transparent outline-none"
          >
            <option value="">All Grades</option>
            {grades.map((grade) => (
              <option key={grade.id} value={grade.id}>
                Grade {grade.level}
              </option>
            ))}
          </select>
        </div>

        {/* Subject Filter */}
        <div className="flex items-center gap-2 rounded-full ring-[1.5px] ring-gray-300 px-2">
          <Image src="/filter.png" alt="" width={14} height={14} />
          <select
            value={selectedSubject}
            onChange={(e) => {
              setSelectedSubject(e.target.value);
              setTimeout(handleFilterChange, 100);
            }}
            className="w-[150px] p-2 bg-transparent outline-none"
          >
            <option value="">All Subjects</option>
            {subjects.map((subject) => (
              <option key={subject.id} value={subject.id}>
                {subject.name}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};

export default StatsFilters;
