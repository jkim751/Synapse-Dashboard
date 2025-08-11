"use client"

import { useUser } from "@clerk/nextjs";
import { currentUser } from "@clerk/nextjs/server";
import { headers } from "next/headers";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

const menuItems = [
  {
    title: "MENU",
    items: [
      {
        icon: "/home.png",
        label: "Home",
        href: "/",
        visible: ["admin", "teacher", "student", "parent"],
      },
      {
        icon: "/teacher.png",
        label: "Teachers",
        href: "/list/teachers",
        visible: ["admin",],
      },
      {
        icon: "/student.png",
        label: "Students",
        href: "/list/students",
        visible: ["admin", "teacher"],
      },
      {
        icon: "/parent.png",
        label: "Parents",
        href: "/list/parents",
        visible: ["admin",],
      },
      {
        icon: "/subject.png",
        label: "Subjects",
        href: "/list/subjects",
        visible: ["admin"],
      },
      {
        icon: "/class.png",
        label: "Classes",
        href: "/list/classes",
        visible: ["admin", "teacher"],
      },
      {
        icon: "/lesson.png",
        label: "Lessons",
        href: "/list/lessons",
        visible: ["admin", "teacher"],
      },
      {
        icon: "/exam.png",
        label: "Exams",
        href: "/list/exams",
        visible: ["teacher", "student", "parent"],
      },
      {
        icon: "/assignment.png",
        label: "Assignments",
        href: "/list/assignments",
        visible: ["teacher", "student", "parent"],
      },
      {
        icon: "/result.png",
        label: "Results",
        href: "/list/results",
        visible: ["teacher", "student", "parent"],
      },
      {
        icon: "/attendance.png",
        label: "Attendance",
        href: "/list/attendance",
        visible: ["admin", "teacher",],
      },
      {
        label: "Attendance History",
        href: "/list/attendance/history",
        icon: "/singleLesson.png",
        visible: ["admin", "teacher"],
      },
      {
        icon: "/calendar.png",
        label: "Events",
        href: "/list/events",
        visible: ["admin", "teacher", "student", "parent"],
      },
      {
        icon: "/announcement.png",
        label: "Announcements",
        href: "/list/announcements",
        visible: ["admin", "teacher", "student", "parent"],
      },
      {
        icon: "/finance.png",
        label: "Payments",
        href: "/list/invoices",
        visible: ["parent"],
      },
      {
        icon: "/finance.png",
        label: "Xero Dashboard",
        href: "/list/xero",
        visible: ["admin"],
      },
      {
        icon: "/finance.png",
        label: "Payroll",
        href: "/list/payroll",
        visible: ["teacher"],
      },
    ],  
  },
];

const Menu = () => {
  const { user } = useUser();
  const role = user?.publicMetadata?.role as string;
  const pathname = usePathname();
  
  return (
    <div className="mt-4 text-sm">
      {menuItems.map((i) => (
        <div className="flex flex-col gap-2" key={i.title}>
          <span className="hidden lg:block text-gray-400 font-light my-4">
            {i.title}
          </span>
          {i.items.map((item) => {
            if (item.visible.includes(role)) {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              return (
                <Link
                  href={item.href}
                  key={item.label}
                  className={`flex items-center justify-center lg:justify-start gap-4 text-gray-500 py-2 md:px-2 rounded-xl hover:bg-lamaSkyLight ${
                    isActive ? 'bg-orange-100' : ''
                  }`}                >
                  <Image src={item.icon} alt="" width={20} height={20} />
                  <span className="hidden lg:block">{item.label}</span>
                </Link> 
              );
            }
          })}
        </div>
      ))}
    </div>
  );
};

export default Menu;
