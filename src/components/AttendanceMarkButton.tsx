
"use client";

import { useState, useTransition } from "react";

interface AttendanceMarkButtonProps {
  studentId: string;
  lessonId: number;
  currentStatus: boolean | undefined;
  date: Date;
  initialStatus?: boolean | undefined;

onStatusChange?: 
(lessonId: number,
present: boolean) 
=> void;
}

const AttendanceMarkButton = ({ 
  studentId, 
  lessonId, 
  currentStatus, 
  date,
  initialStatus,
  onStatusChange
}: 

AttendanceMarkButtonProps) => {
  const [status, setStatus] = useState<boolean | undefined>(currentStatus);
  const [isPending, startTransition] = useTransition();

  const markAttendance = async (present: boolean) => {
    startTransition(async () => {
      try {
        console.log('Sending attendance request:', {
            studentId,
            lessonId,
            present,
            date: date.toISOString(),
          });
          
        const response = await fetch('/api/attendance', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            studentId,
            lessonId,
            present,
            date: date.toISOString(),
          }),
        });

        if (response.ok) {
          setStatus(present);
          onStatusChange?.(lessonId, present);
        } else {
          console.error('Failed to mark attendance');
        }
      } catch (error) {
        console.error('Error marking attendance:', error);
      }
    });
  };

  return (
    <div className="flex gap-1">
      <button
        onClick={() => markAttendance(true)}
        disabled={isPending}
        className={`w-6 h-6 rounded-full text-xs font-bold transition-all ${
          status === true
            ? "bg-green-500 text-white"
            : "bg-gray-200 hover:bg-green-200 text-gray-600"
        } ${isPending ? "opacity-50 cursor-not-allowed" : ""}`}
        title="Mark Present"
      >
        ✓
      </button>
      <button
        onClick={() => markAttendance(false)}
        disabled={isPending}
        className={`w-6 h-6 rounded-full text-xs font-bold transition-all ${
          status === false
            ? "bg-red-500 text-white"
            : "bg-gray-200 hover:bg-red-200 text-gray-600"
        } ${isPending ? "opacity-50 cursor-not-allowed" : ""}`}
        title="Mark Absent"
      >
        ✗
      </button>
    </div>
  );
};

export default AttendanceMarkButton;
