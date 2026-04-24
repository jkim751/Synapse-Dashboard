"use client";

import { useState } from "react";
import Menu from "./Menu";
import Image from "next/image";
import Link from "next/link";

interface DashboardShellProps {
  navbar: React.ReactNode;
  children: React.ReactNode;
}

export default function DashboardShell({ navbar, children }: DashboardShellProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="h-screen flex overflow-hidden">
      {/* Mobile backdrop */}
      <div
        className={`fixed inset-0 bg-black/40 z-40 transition-opacity duration-300 md:hidden ${
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setOpen(false)}
      />

      {/* Sidebar */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 w-72 bg-white shadow-xl overflow-y-auto
          transform transition-transform duration-300 ease-in-out
          md:static md:z-auto md:shadow-none md:bg-transparent md:translate-x-0
          md:w-[8%] lg:w-[16%] xl:w-[14%]
          p-4 flex flex-col flex-shrink-0
          ${open ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        {/* Logo row */}
        <div className="flex items-center justify-between mb-2 flex-shrink-0">
          {/* Mobile logo — always shows text */}
          <Link
            href="/"
            className="flex items-center gap-2 md:hidden"
            onClick={() => setOpen(false)}
          >
            <Image src="/logo.png" alt="logo" width={32} height={32} className="w-auto h-auto" />
            <span className="font-bold text-sm">Synapse Portal</span>
          </Link>
          {/* Desktop logo */}
          <Link
            href="/"
            className="hidden md:flex items-center justify-center lg:justify-start gap-2 flex-1"
          >
            <Image src="/logo.png" alt="logo" width={32} height={32} className="w-auto h-auto" />
            <span className="hidden lg:block font-bold text-sm">Synapse Portal</span>
          </Link>
          {/* Mobile close button */}
          <button
            className="md:hidden p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 flex-shrink-0"
            onClick={() => setOpen(false)}
            aria-label="Close menu"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Mobile menu — always shows labels */}
        <div className="md:hidden flex-1 overflow-y-auto">
          <Menu onClose={() => setOpen(false)} showLabels />
        </div>
        {/* Desktop menu — uses responsive lg:block for labels */}
        <div className="hidden md:block flex-1 overflow-y-auto">
          <Menu />
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 min-w-0 bg-[#F7F8FA] overflow-y-auto flex flex-col">
        {/* Navbar row — hamburger on mobile, full navbar */}
        <div className="flex items-center flex-shrink-0">
          <button
            className="md:hidden p-4 text-gray-600 hover:text-gray-900 flex-shrink-0"
            onClick={() => setOpen(true)}
            aria-label="Open sidebar"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="flex-1 min-w-0">{navbar}</div>
        </div>
        {/* Page content */}
        <div className="flex-1">{children}</div>
      </div>
    </div>
  );
}
