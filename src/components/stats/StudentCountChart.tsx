"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";

interface StudentCountData {
  month: string;
  total: number;
  current: number;
  trial: number;
}

interface Grade {
  id: number;
  level: number;
}

interface Subject {
  id: number;
  name: string;
}

interface StudentCountChartProps {
  data: StudentCountData[];
  grades: Grade[];
  subjects: Subject[];
}

const StudentCountChart = ({ data, grades, subjects }: StudentCountChartProps) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showFilters, setShowFilters] = useState(false);
  const [selectedGrade, setSelectedGrade] = useState(searchParams.get("gradeId") || "");
  const [selectedSubject, setSelectedSubject] = useState(searchParams.get("subjectId") || "");

  const applyFilters = () => {
    const params = new URLSearchParams(searchParams);
    
    if (selectedGrade) params.set("gradeId", selectedGrade);
    else params.delete("gradeId");
    
    if (selectedSubject) params.set("subjectId", selectedSubject);
    else params.delete("subjectId");

    router.push(`/list/stats?${params.toString()}`);
  };

  const clearFilters = () => {
    setSelectedGrade("");
    setSelectedSubject("");
    const params = new URLSearchParams(searchParams);
    params.delete("gradeId");
    params.delete("subjectId");
    router.push(`/list/stats?${params.toString()}`);
  };

  const hasActiveFilters = selectedGrade || selectedSubject;

  if (data.length === 0) {
    return (
      <div className="h-[300px] flex items-center justify-center">
        <p className="text-gray-500 text-sm">No student data available</p>
      </div>
    );
  }

  const maxValue = Math.max(...data.map(item => item.total));

  return (
    <div className="h-[300px] flex flex-col">
      {/* Filter Button */}
      <div className="mb-3 flex justify-end">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
            hasActiveFilters
              ? 'bg-orange-100 text-orange-700 border border-orange-300'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <Image src="/filter.png" alt="" width={14} height={14} />
          Filters
          {hasActiveFilters && (
            <span className="bg-orange-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px]">
              {(selectedGrade ? 1 : 0) + (selectedSubject ? 1 : 0)}
            </span>
          )}
        </button>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="mb-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <select
                value={selectedGrade}
                onChange={(e) => setSelectedGrade(e.target.value)}
                className="flex-1 px-2 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:border-orange-500"
              >
                <option value="">All Grades</option>
                {grades.map((grade) => (
                  <option key={grade.id} value={grade.id}>
                    Grade {grade.level}
                  </option>
                ))}
              </select>

              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="flex-1 px-2 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:border-orange-500"
              >
                <option value="">All Subjects</option>
                {subjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-2 justify-end">
              <button
                onClick={clearFilters}
                className="px-3 py-1 text-xs text-gray-600 hover:text-gray-800"
              >
                Clear
              </button>
              <button
                onClick={applyFilters}
                className="px-3 py-1 text-xs bg-orange-500 text-white rounded hover:bg-orange-600"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Chart */}
      <div className="flex-1 space-y-3 overflow-y-auto">
        {data.map((item, index) => (
          <div key={index} className="space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-xs font-medium text-gray-600">{item.month}</span>
              <div className="flex gap-2 text-xs">
                <span className="text-gray-600">Total: <span className="font-semibold">{item.total}</span></span>
              </div>
            </div>
            
            <div className="relative h-8 bg-gray-100 rounded overflow-hidden">
              {/* Current students bar */}
              <div
                className="absolute left-0 top-0 h-8 bg-lamaSky flex items-center justify-start px-2 transition-all duration-300"
                style={{ width: `${Math.max((item.current / maxValue) * 100, 5)}%` }}
              >
                {item.current > 0 && (
                  <span className="text-white text-xs font-medium whitespace-nowrap">
                    {item.current}
                  </span>
                )}
              </div>
              
              {/* Trial students bar */}
              <div
                className="absolute h-8 bg-lamaYellow flex items-center justify-start px-2 transition-all duration-300"
                style={{ 
                  left: `${(item.current / maxValue) * 100}%`,
                  width: `${Math.max((item.trial / maxValue) * 100, 5)}%` 
                }}
              >
                {item.trial > 0 && (
                  <span className="text-white text-xs font-medium whitespace-nowrap">
                    {item.trial}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex justify-center gap-4 pt-3 mt-3 border-t border-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-lamaSky rounded"></div>
          <span className="text-xs text-gray-600">Current Students</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-lamaYellow rounded"></div>
          <span className="text-xs text-gray-600">Trial Students</span>
        </div>
      </div>
    </div>
  );
};

export default StudentCountChart;
