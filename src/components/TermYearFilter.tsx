"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";

const TERMS = [1, 2, 3, 4];
const YEARS = [2024, 2025, 2026, 2027, 2028];

export default function TermYearFilter() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentTerm = searchParams.get("term") ?? "";
  const currentYear = searchParams.get("year") ?? "";

  const update = (key: "term" | "year", value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  };

  const hasFilter = currentTerm || currentYear;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <select
        value={currentTerm}
        onChange={(e) => update("term", e.target.value)}
        className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-orange-400 text-gray-600"
      >
        <option value="">All Terms</option>
        {TERMS.map((t) => (
          <option key={t} value={t}>Term {t}</option>
        ))}
      </select>

      <select
        value={currentYear}
        onChange={(e) => update("year", e.target.value)}
        className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-orange-400 text-gray-600"
      >
        <option value="">All Years</option>
        {YEARS.map((y) => (
          <option key={y} value={y}>{y}</option>
        ))}
      </select>

      {hasFilter && (
        <button
          onClick={() => {
            const params = new URLSearchParams(searchParams.toString());
            params.delete("term");
            params.delete("year");
            params.delete("page");
            router.push(`${pathname}?${params.toString()}`);
          }}
          className="text-xs text-gray-400 hover:text-red-400 transition-colors px-2 py-1.5"
        >
          Clear
        </button>
      )}
    </div>
  );
}
