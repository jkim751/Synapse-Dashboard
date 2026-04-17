"use client";

import { useRouter, usePathname } from "next/navigation";

const TeacherAdminViewToggle = ({ currentView }: { currentView: "admin" | "teacher" }) => {
  const router = useRouter();
  const pathname = usePathname();

  const toggle = () => {
    const next = currentView === "admin" ? "teacher" : "admin";
    router.push(`${pathname}?calendarView=${next}`);
  };

  const isTeacherView = currentView === "teacher";

  return (
    <button
      onClick={toggle}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
        isTeacherView
          ? "bg-orange-400 text-white border-orange-400"
          : "bg-white text-gray-500 border-gray-300 hover:border-orange-300 hover:text-orange-500"
      }`}
      title={isTeacherView ? "Switch to Admin View (all lessons)" : "Switch to Teacher View (your lessons only)"}
    >
      {isTeacherView ? "My Lessons" : "All Lessons"}
    </button>
  );
};

export default TeacherAdminViewToggle;
