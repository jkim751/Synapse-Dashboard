"use client";

import { ITEM_PER_PAGE } from "@/lib/settings";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

const Pagination = ({ page, count }: { page: number; count: number }) => {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const totalPages = Math.ceil(count / ITEM_PER_PAGE);

  const hasPrev = page > 1;
  const hasNext = page < totalPages;

  const buildHref = (p: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", p.toString());
    return `${pathname}?${params}`;
  };

  return (
    <div className="p-4 flex items-center justify-between text-gray-500">
      {hasPrev ? (
        <Link
          href={buildHref(page - 1)}
          prefetch
          className="py-2 px-4 rounded-xl bg-slate-200 text-xs font-semibold hover:bg-slate-300 transition-colors"
        >
          Prev
        </Link>
      ) : (
        <span className="py-2 px-4 rounded-xl bg-slate-200 text-xs font-semibold opacity-50 cursor-not-allowed">
          Prev
        </span>
      )}

      <div className="flex items-center gap-2 text-sm">
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
          <Link
            key={p}
            href={buildHref(p)}
            prefetch
            className={`px-2 py-1 rounded-xl transition-colors ${
              page === p
                ? "bg-orange-100 font-semibold pointer-events-none"
                : "hover:bg-slate-100"
            }`}
          >
            {p}
          </Link>
        ))}
      </div>

      {hasNext ? (
        <Link
          href={buildHref(page + 1)}
          prefetch
          className="py-2 px-4 rounded-xl bg-slate-200 text-xs font-semibold hover:bg-slate-300 transition-colors"
        >
          Next
        </Link>
      ) : (
        <span className="py-2 px-4 rounded-xl bg-slate-200 text-xs font-semibold opacity-50 cursor-not-allowed">
          Next
        </span>
      )}
    </div>
  );
};

export default Pagination;
