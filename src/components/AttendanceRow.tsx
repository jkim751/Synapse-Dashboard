"use client";

import { Student } from "@prisma/client";
import AttendanceMarkButton from "./AttendanceMarkButton";
import AttendanceStatusDisplay from "./AttendanceStatusDisplay";
import { useState, useEffect } from "react";

type AttendanceStatus = "present" | "absent" | "trial" | "makeup" | "cancelled";

interface AttendanceRowProps {
  student: Student;
  attendanceMap: Map<string, AttendanceStatus>;
  todayLessons: Array<{
    id: string;
    originalId: number;
    originalType: 'regular' | 'recurring';
    subject: { name: string };
    teacher: { name: string; surname: string };
    startTime: Date;
  }>;
  date: Date;
}

const AttendanceRow = ({ 
  student, 
  attendanceMap, 
  todayLessons, 
  date 
}: AttendanceRowProps) => {
  const [localAttendanceMap, setLocalAttendanceMap] = useState(attendanceMap);

  // Reset attendance map when date or attendanceMap changes
  useEffect(() => {
    setLocalAttendanceMap(new Map(attendanceMap));
  }, [attendanceMap, date]);

  const handleStatusChange = (
    lessonId: number | undefined,
    recurringLessonId: number | undefined,
    status: AttendanceStatus | undefined
  ) => {
    const key = lessonId ? `lesson_${lessonId}` : `recurring_${recurringLessonId}`;
    const newMap = new Map(localAttendanceMap);
    
    if (status === undefined) {
      newMap.delete(key); // Remove the entry if status is cleared
    } else {
      newMap.set(key, status);
    }
    
    setLocalAttendanceMap(newMap);
  };

  // Calculate overall attendance status for the day
  const getOverallStatus = () => {
    if (todayLessons.length === 0) return null;
    
    const statuses = todayLessons.map(lesson => 
      localAttendanceMap.get(lesson.id)
    ).filter(Boolean);
    
    if (statuses.length === 0) return null;
    
    // If all are present, show present
    if (statuses.every(s => s === 'present')) return 'present';
    // If any are absent, show absent
    if (statuses.some(s => s === 'absent')) return 'absent';
    // If mixed or other statuses, show the first non-present status
    return statuses.find(s => s !== 'present') || statuses[0];
  };

  const overallStatus = getOverallStatus();

  return (
    <tr className="border-b border-gray-200 even:bg-slate-50 text-sm hover:bg-lamaPurpleLight">
      <td className="flex items-center gap-4 p-4">
        <div>
          <h3 className="font-medium">{student.name} {student.surname}</h3>
          <p className="text-xs text-gray-500">{student.email}</p>
        </div>
      </td>
      
      <td className="p-4">
        <div className="space-y-2">
          {todayLessons.length > 0 ? (
            todayLessons.map((lesson) => {
              const currentStatus = localAttendanceMap.get(lesson.id);
              
              return (
                <div key={`${lesson.id}-${date.toISOString()}`} className="flex items-center gap-3 py-1">
                  <div className="min-w-[120px] text-xs">
                    <div className="font-medium">{lesson.subject.name}</div>
                    <div className="text-gray-500">
                      {lesson.startTime.toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </div>
                  
                  <AttendanceMarkButton
                    key={`${lesson.id}-${date.toDateString()}`} // Force re-render on date change
                    studentId={student.id}
                    lessonId={lesson.originalType === 'regular' ? lesson.originalId : undefined}
                    recurringLessonId={lesson.originalType === 'recurring' ? lesson.originalId : undefined}
                    currentStatus={currentStatus}
                    date={date}
                    onStatusChange={handleStatusChange}
                    showCurrentStatus={true}
                  />
                </div>
              );
            })
          ) : (
            <div className="text-gray-500 text-xs">No lessons scheduled</div>
          )}
        </div>
      </td>
      
      <td className="p-4 text-center">
        {overallStatus ? (
          <AttendanceStatusDisplay status={overallStatus} />
        ) : (
          <span className="text-gray-400 text-xs">
            {todayLessons.length === 0 ? "No lessons" : "Not marked"}
          </span>
        )}
      </td>
    </tr>
  );
};

export default AttendanceRow;