"use client";

import { useState, useCallback } from "react";
import Image from "next/image";
import AttendanceMarkButton from "./AttendanceMarkButton";
import { Student, Attendance, Lesson } from "@prisma/client";

type StudentWithAttendance = Student & {
  attendances: (Attendance & { lesson: Lesson })[];
};

interface AttendanceRowProps {
  student: StudentWithAttendance;
  attendanceMap: Map<number, boolean>;
  todayLessons: (Lesson & {
    subject: { name: string };
    teacher: { name: string; surname: string };
  })[];
  date: Date;
}

const AttendanceRow = ({
  student,
  attendanceMap,
  todayLessons,
  date,
}: AttendanceRowProps) => {
  const isToday = new Date().toDateString() === date.toDateString();
  // Initialize local state with current attendance statuses
  const [localAttendance, setLocalAttendance] = useState<
    Map<number, boolean | undefined>
  >(new Map(attendanceMap));

  const handleAttendanceChange = useCallback(
    (lessonId: number, present: boolean) => {
      setLocalAttendance((prev) => new Map(prev.set(lessonId, present)));
    },
    [],
  );

  // Calculate attendance rate based on local state
  const calculateAttendanceRate = () => {
    const presentCount = Array.from(localAttendance.values()).filter(
      (status) => status === true,
    ).length;
    const totalLessons = todayLessons.length;
    return totalLessons > 0
      ? Math.round((presentCount / totalLessons) * 100)
      : 0;
  };

  const attendanceRate = calculateAttendanceRate();

  return (
    <tr className="border-b border-gray-200 even:bg-slate-50 text-sm hover:bg-lamaPurpleLight">
      <td className="flex items-center gap-4 p-4">
        <Image
          src={student.img || "/noAvatar.png"}
          alt=""
          width={40}
          height={40}
          className="md:hidden xl:block w-10 h-10 rounded-full object-cover"
        />
        <div className="flex flex-col">
          <h3 className="font-semibold">
            {student.name} {student.surname}
          </h3>
          <p className="text-xs text-gray-500">{student.id.slice(0, 8)}...</p>
        </div>
      </td>
      <td className="text-center">
        <div className="flex flex-col items-center justify-center gap-2 p-2">
          {todayLessons.map((lesson) => {
            const isPresent = localAttendance.get(lesson.id);
            return (
              <div key={lesson.id} className="flex items-center justify-center">
                {isToday ? (
                  <AttendanceMarkButton
                    key={lesson.id}
                    studentId={student.id}
                    lessonId={lesson.id}
                    date={date}
                    initialStatus={attendanceMap.get(lesson.id)}
                    onStatusChange={(lessonId, status) => handleAttendanceChange(lessonId, status)} currentStatus={undefined}                  />
                ) : (
                  <div
                    key={lesson.id}
                    className={`px-2 py-1 rounded text-xs ${
                      attendanceMap.get(lesson.id) === true
                        ? "bg-green-100 text-green-800"
                        : attendanceMap.get(lesson.id) === false
                        ? "bg-red-100 text-red-800"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {attendanceMap.get(lesson.id) === true
                      ? "Present"
                      : attendanceMap.get(lesson.id) === false
                      ? "Absent"
                      : "Not Marked"}
                  </div>
                )}
              </div>
            );
          })}
          {todayLessons.length === 0 && (
            <span className="text-sm text-gray-500">No lessons today</span>
          )}
        </div>
      </td>
      <td className="text-center">
        <span
          className={`px-3 py-1 rounded-full text-sm font-semibold transition-colors ${
            attendanceRate >= 80
              ? "bg-green-100 text-green-800"
              : attendanceRate >= 60
                ? "bg-yellow-100 text-yellow-800"
                : "bg-red-100 text-red-800"
          }`}
        >
          {attendanceRate}%
        </span>
      </td>
    </tr>
  );
};

export default AttendanceRow;