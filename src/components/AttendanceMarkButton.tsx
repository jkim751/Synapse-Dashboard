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
    status: AttendanceStatus | undefined
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
        // If clicking the same status, deselect it
        const finalStatus = status === newStatus ? undefined : newStatus;

        const requestBody: any = {
          studentId,
          date: date.toISOString(),
        };

        // Add status or mark as cleared
        if (finalStatus) {
          requestBody.status = finalStatus;
        } else {
          requestBody.clear = true; // Flag to indicate we want to clear the attendance
        }

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
          method: finalStatus ? 'POST' : 'DELETE', // Use DELETE for clearing
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        });

        if (response.ok) {
          setStatus(finalStatus);
          onStatusChange?.(lessonId, recurringLessonId, finalStatus);
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
    const isCurrentlySelected = status === statusType;
    const titles = {
      present: isCurrentlySelected ? "Clear Present" : "Mark Present",
      absent: isCurrentlySelected ? "Clear Absent" : "Mark Absent",
      trial: isCurrentlySelected ? "Clear Trial" : "Mark as Trial",
      makeup: isCurrentlySelected ? "Clear Make-up" : "Mark as Make-up",
      cancelled: isCurrentlySelected ? "Clear Cancelled" : "Mark as Cancelled/Moved",
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
