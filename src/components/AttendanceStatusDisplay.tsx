"use client";

type AttendanceStatus = "present" | "absent" | "trial" | "makeup" | "cancelled";

interface AttendanceStatusDisplayProps {
  status?: AttendanceStatus | null;
  present?: boolean;
  compact?: boolean;
}

const AttendanceStatusDisplay = ({ 
  status, 
  present, 
  compact = false 
}: AttendanceStatusDisplayProps) => {
  const getStatusDisplay = () => {
    if (status && typeof status === 'string') {
      const statusConfig = {
        present: { text: "Present", color: "bg-green-100 text-green-800", icon: "✓" },
        absent: { text: "Absent", color: "bg-red-100 text-red-800", icon: "✗" },
        trial: { text: "Trial", color: "bg-blue-100 text-blue-800", icon: "T" },
        makeup: { text: "Make-up", color: "bg-purple-100 text-purple-800", icon: "M" },
        cancelled: { text: "Cancelled", color: "bg-orange-100 text-orange-800", icon: "C" },
      };
      
      const config = statusConfig[status as keyof typeof statusConfig];
      if (config) {
        return config;
      }
    }
    
    // Fallback for records without status field
    if (present !== undefined) {
      return present 
        ? { text: "Present", color: "bg-green-100 text-green-800", icon: "✓" }
        : { text: "Absent", color: "bg-red-100 text-red-800", icon: "✗" };
    }

    // Not marked yet
    return { text: "Not Marked", color: "bg-gray-100 text-gray-600", icon: "?" };
  };

  const statusDisplay = getStatusDisplay();

  if (compact) {
    return (
      <span className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center ${statusDisplay.color}`}>
        {statusDisplay.icon}
      </span>
    );
  }

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusDisplay.color}`}>
      {statusDisplay.text}
    </span>
  );
};

export default AttendanceStatusDisplay;
