"use client";

import { useState } from "react";

interface Grade {
  id: number;
  level: number;
}

interface GradeMultiSelectProps {
  grades: Grade[];
  selectedGradeIds: number[];
  onChange: (gradeIds: number[]) => void;
  error?: { message?: string };
}

const GradeMultiSelect = ({ grades, selectedGradeIds, onChange, error }: GradeMultiSelectProps) => {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredGrades = grades.filter(grade =>
    grade.level.toString().includes(searchTerm)
  );

  const handleGradeToggle = (gradeId: number) => {
    const newSelectedIds = selectedGradeIds.includes(gradeId)
      ? selectedGradeIds.filter(id => id !== gradeId)
      : [...selectedGradeIds, gradeId];
    onChange(newSelectedIds);
  };

  const selectAll = () => {
    onChange(grades.map(grade => grade.id));
  };

  const selectNone = () => {
    onChange([]);
  };

  const sortedGrades = filteredGrades.sort((a, b) => a.level - b.level);

  return (
    <div className="w-full">
      <label className="text-sm font-medium">Select Grades</label>
      
      <div className="mt-2 border rounded-lg p-3 max-h-64 overflow-y-auto">
        <div className="flex gap-2 mb-3">
          <input
            type="text"
            placeholder="Search grades..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 px-3 py-1 border rounded text-sm"
          />
          <button
            type="button"
            onClick={selectAll}
            className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
          >
            Select All
          </button>
          <button
            type="button"
            onClick={selectNone}
            className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
          >
            Clear
          </button>
        </div>

        <div className="space-y-2">
          {sortedGrades.map((grade) => (
            <label key={grade.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
              <input
                type="checkbox"
                checked={selectedGradeIds.includes(grade.id)}
                onChange={() => handleGradeToggle(grade.id)}
                className="form-checkbox"
              />
              <span className="flex-1">Grade {grade.level}</span>
              <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">
                Level {grade.level}
              </span>
            </label>
          ))}
        </div>

        {sortedGrades.length === 0 && (
          <p className="text-gray-500 text-sm text-center py-4">No grades found</p>
        )}
      </div>

      {selectedGradeIds.length > 0 && (
        <p className="text-sm text-gray-600 mt-2">
          {selectedGradeIds.length} grade(s) selected
        </p>
      )}

      {error?.message && (
        <span className="text-red-500 text-sm">{error.message}</span>
      )}
    </div>
  );
};

export default GradeMultiSelect;
