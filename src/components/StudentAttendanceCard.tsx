import prisma from "@/lib/prisma";

const StudentAttendanceCard = async ({ id }: { id: string }) => {
  try {
    const startOfYear = new Date(new Date().getFullYear(), 0, 1);

    const attendance = await prisma.attendance.findMany({
      where: {
        studentId: id,
        date: { gte: startOfYear },
      },
      select: {
        present: true,
        status: true,
      },
    });

    // Filter out cancelled lessons from the total count (only if status field exists)
    const validAttendance = attendance.filter((a: { status: string; }) => {
      try {
        return a.status !== "cancelled";
      } catch (error) {
        // If status field doesn't exist, include all records
        return true;
      }
    });
    
    const totalDays = validAttendance.length;
    
    // Count present days (including make-ups and trials as positive attendance)
    const presentDays = validAttendance.filter((a: { status: string; present: any; }) => {
      try {
        if (a.status && typeof a.status === 'string') {
          return a.status === "present" || a.status === "makeup" || a.status === "trial";
        }
      } catch (error) {
        // Status field doesn't exist, fallback to present field
      }
      return a.present; // fallback for records without status
    }).length;
    
    const percentage = totalDays > 0 ? (presentDays / totalDays) * 100 : 0;

    return (
      <div className="">
        <h1 className="text-xl font-semibold">{totalDays ? percentage.toFixed(0) : "-"}%</h1>
        <span className="text-sm text-gray-400">Attendance</span>
      </div>
    );
  } catch (error) {
    console.error("Error fetching attendance:", error);
    return (
      <div className="">
        <h1 className="text-xl font-semibold">-</h1>
        <span className="text-sm text-gray-400">Attendance</span>
      </div>
    );
  }
};

export default StudentAttendanceCard;
