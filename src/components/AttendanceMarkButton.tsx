"use client";

import { useState, useTransition, useEffect } from "react";
import AttendanceStatusDisplay from "./AttendanceStatusDisplay";

type AttendanceStatus = "present" | "absent" | "trial" | "makeup" | "cancelled";

interface AttendanceMarkButtonProps {
  studentId: string;
  lessonId?: number;
  recurringLessonId?: number;
  currentStatus?: AttendanceStatus;
  date: Date;
  onStatusChange?: (
    lessonId: number | undefined,
    recurringLessonId: number | undefined,
    status: AttendanceStatus
  ) => void;
  showCurrentStatus?: boolean;
}

const AttendanceMarkButton = ({ 
  studentId, 
  lessonId,
  recurringLessonId,
  currentStatus, 
  date,
  onStatusChange,
  showCurrentStatus = false
}: AttendanceMarkButtonProps) => {
  const [status, setStatus] = useState<AttendanceStatus | undefined>(currentStatus);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setStatus(currentStatus);
  }, [currentStatus]);

  const markAttendance = async (newStatus: AttendanceStatus) => {
    startTransition(async () => {
      try {
        const requestBody: any = {
          studentId,
          status: newStatus,
          date: date.toISOString(),
        };

        if (lessonId && typeof lessonId === 'number') {
          requestBody.lessonId = lessonId;
        } else if (recurringLessonId && typeof recurringLessonId === 'number') {
          requestBody.recurringLessonId = recurringLessonId;
        } else {
          console.error('Invalid lesson ID provided:', { lessonId, recurringLessonId });
          return;
        }

        console.log('Sending attendance request:', requestBody);
          
        const response = await fetch('/api/attendance', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        });

        if (response.ok) {
          setStatus(newStatus);
          onStatusChange?.(lessonId, recurringLessonId, newStatus);
        } else {
          const errorData = await response.json();
          console.error('Failed to mark attendance:', errorData);
        }
      } catch (error) {
        console.error('Error marking attendance:', error);
      }
    });
  };

  const getStatusColor = (statusType: AttendanceStatus, isActive: boolean) => {
    const colors = {
      present: isActive ? "bg-green-500 text-white" : "bg-gray-200 hover:bg-green-200 text-gray-600",
      absent: isActive ? "bg-red-500 text-white" : "bg-gray-200 hover:bg-red-200 text-gray-600",
      trial: isActive ? "bg-blue-500 text-white" : "bg-gray-200 hover:bg-blue-200 text-gray-600",
      makeup: isActive ? "bg-purple-500 text-white" : "bg-gray-200 hover:bg-purple-200 text-gray-600",
      cancelled: isActive ? "bg-orange-500 text-white" : "bg-gray-200 hover:bg-orange-200 text-gray-600",
    };
    return colors[statusType];
  };

  const getStatusIcon = (statusType: AttendanceStatus) => {
    const icons = {
      present: "✓",
      absent: "✗",
      trial: "T",
      makeup: "M",
      cancelled: "C",
    };
    return icons[statusType];
  };

  const getStatusTitle = (statusType: AttendanceStatus) => {
    const titles = {
      present: "Mark Present",
      absent: "Mark Absent",
      trial: "Mark as Trial",
      makeup: "Mark as Make-up",
      cancelled: "Mark as Cancelled/Moved",
    };
    return titles[statusType];
  };

  const statuses: AttendanceStatus[] = ["present", "absent", "trial", "makeup", "cancelled"];

  return (
    <div className="flex items-center gap-2">
      {showCurrentStatus && (
        <div className="mr-2">
          <AttendanceStatusDisplay status={status} compact />
        </div>
      )}
      <div className="flex gap-1 flex-wrap">
        {statuses.map((statusType) => (
          <button
            key={statusType}
            onClick={() => markAttendance(statusType)}
            disabled={isPending}
            className={`w-6 h-6 rounded-full text-xs font-bold transition-all ${
              getStatusColor(statusType, status === statusType)
            } ${isPending ? "opacity-50 cursor-not-allowed" : ""}`}
            title={getStatusTitle(statusType)}
          >
            {getStatusIcon(statusType)}
          </button>
        ))}
      </div>
    </div>
  );
};

export default AttendanceMarkButton;
