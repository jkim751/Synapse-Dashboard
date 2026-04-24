"use client"

import { useUser } from "@clerk/nextjs";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const menuItems = [
  {
    title: "MENU",
    items: [
      {
        icon: "/home.png",
        label: "Home",
        href: "/",
        visible: ["admin", "director", "teacher-admin", "teacher", "student", "parent"],
      },
      {
        icon: "/stats.png",
        label: "Statistics",
        href: "/list/stats",
        visible: ["admin", "director", "teacher-admin"],
      },
      {
        icon: "/handover.png",
        label: "Notes",
        href: "/list/notes",
        visible: ["admin", "director", "teacher-admin"],
      },
      {
        icon: "/subject.png",
        label: "Subjects",
        href: "/list/subjects",
        visible: ["admin", "director", "teacher-admin"],
      },
      {
        icon: "/class.png",
        label: "Classes",
        href: "/list/classes",
        visible: ["admin", "director", "teacher", "teacher-admin"],
      },
      {
        icon: "/lesson.png",
        label: "Lessons",
        href: "/list/lessons",
        visible: ["admin", "director", "teacher", "teacher-admin"],
      },
      {
        icon: "/exam.png",
        label: "Assessments",
        href: "/list/assessments",
        visible: ["teacher", "teacher-admin", "student", "parent"],
      },
      {
        icon: "/result.png",
        label: "Results",
        href: "/list/results",
        visible: ["teacher", "teacher-admin", "student", "parent"],
      },
      {
        icon: "/attendance.png",
        label: "Attendance",
        href: "/list/attendance",
        visible: ["admin", "director", "teacher", "teacher-admin"],
      },
      {
        label: "Attendance History",
        href: "/list/attendance/history",
        icon: "/singleLesson.png",
        visible: ["admin", "director", "teacher-admin"],
      },
      {
        icon: "/finance.png",
        label: "Payments",
        href: "/list/invoices",
        visible: ["parent"],
      },
      {
        icon: "/xero.png",
        label: "Xero Dashboard",
        href: "/list/xero",
        visible: ["admin", "director", "teacher-admin"],
      },
      {
        icon: "/expenses.png",
        label: "Expenses",
        href: "/list/expenses",
        visible: [ "director"],
      },
      {
        icon: "/finance.png",
        label: "Cashbook",
        href: "/list/cashbook",
        visible: ["admin", "director", "teacher-admin"],
      },
      {
        icon: "/payrates.png",
        label: "Pay Rates",
        href: "/list/pay",
        visible: ["director"],
      },
      {
        icon: "/setting.png",
        label: "Pricing Sheet",
        href: "/list/paysheet",
        visible: ["admin", "director", "teacher-admin"],
      },
      {
        icon: "/reports.png",
        label: "Staff Reports",
        href: "/list/reports",
        visible: ["director"],
      },
      {
        icon: "/finance.png",
        label: "Payroll",
        href: "/list/payroll",
        visible: ["admin", "director", "teacher-admin", "teacher"],
      },
      {
        icon: "/attendance.png",
        label: "Worked Hours",
        href: "/list/hours",
        visible: ["director", "teacher-admin", "teacher"],
      },
      {
        icon: "/calendar.png",
        label: "Events",
        href: "/list/events",
        visible: [],
      },
      {
        icon: "/announcement.png",
        label: "Announcements",
        href: "/list/announcements",
        visible: ["admin", "director", "teacher-admin"],
      },
    ],
  },
];

const accountItems = [
  { icon: "/admin.png", label: "Admins", href: "/list/admins", visible: ["admin", "director", "teacher-admin"] },
  { icon: "/teacher.png", label: "Teachers", href: "/list/teachers", visible: ["admin", "director", "teacher-admin"] },
  { icon: "/student.png", label: "Students", href: "/list/students", visible: ["admin", "director", "teacher", "teacher-admin"] },
  { icon: "/parent.png", label: "Parents", href: "/list/parents", visible: ["admin", "director", "teacher-admin"] },
];

const Menu = () => {
  const { user } = useUser();
  const role = user?.publicMetadata?.role as string;
  const pathname = usePathname();
  const [accountsOpen, setAccountsOpen] = useState(false);

  const visibleAccountItems = accountItems.filter((item) => item.visible.includes(role));
  const isAccountsActive = accountItems.some((item) => pathname === item.href || pathname.startsWith(item.href + '/'));

  return (
    <div className="mt-4 text-sm">
      {menuItems.map((i) => (
        <div className="flex flex-col gap-2" key={i.title}>
          <span className="hidden lg:block text-gray-400 font-light my-4">
            {i.title}
          </span>

          {i.items.map((item) => {
            if (!item.visible.includes(role)) return null;
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <div key={item.label}>
                <Link
                  href={item.href}
                  className={`flex items-center justify-center lg:justify-start gap-4 text-gray-500 py-2 md:px-2 rounded-xl hover:bg-lamaSkyLight transition-colors ${isActive ? 'bg-orange-100' : ''}`}
                >
                  <Image src={item.icon} alt="" width={20} height={20} />
                  <span className="hidden lg:block">{item.label}</span>
                </Link>
                {item.href === '/' && visibleAccountItems.length > 0 && (
                  <div key="accounts-dropdown">
                    <button
                      onClick={() => setAccountsOpen((o) => !o)}
                      className={`w-full flex items-center justify-center lg:justify-start gap-4 text-gray-500 py-2 md:px-2 rounded-xl hover:bg-lamaSkyLight transition-colors ${
                        isAccountsActive ? 'bg-orange-100' : ''
                      }`}
                    >
                      <Image src="/admin.png" alt="" width={20} height={20} />
                      <span className="hidden lg:flex lg:flex-1 lg:items-center lg:justify-between">
                        Accounts
                        <span className="mr-1 text-xs">{accountsOpen ? '▴' : '▾'}</span>
                      </span>
                    </button>
                    {accountsOpen && (
                      <div className="flex flex-col gap-1 ml-0 lg:ml-4 mt-1 animate-slide-down">
                        {visibleAccountItems.map((acc) => {
                          const accActive = pathname === acc.href || pathname.startsWith(acc.href + '/');
                          return (
                            <Link
                              href={acc.href}
                              key={acc.label}
                              className={`flex items-center justify-center lg:justify-start gap-4 text-gray-500 py-2 md:px-2 rounded-xl hover:bg-lamaSkyLight ${
                                accActive ? 'bg-orange-100' : ''
                              }`}
                            >
                              <Image src={acc.icon} alt="" width={20} height={20} />
                              <span className="hidden lg:block">{acc.label}</span>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
};

export default Menu;
