"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/dashboard", label: "Genel Bakış" },
  { href: "/dashboard/alerts", label: "Uyarılar" },
  { href: "/dashboard/cameras", label: "Kameralar" },
  { href: "/dashboard/analytics", label: "Analitik" },
  { href: "/dashboard/settings", label: "Ayarlar" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-full shrink-0 border-b border-white/10 bg-[#0d1e36] md:min-h-screen md:w-56 lg:w-64 md:border-b-0 md:border-r">
      <div className="flex items-center justify-between px-4 py-3 md:block md:p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#d4a64a]">Luro Konsol</p>
      </div>
      <nav className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-col md:gap-2 md:overflow-x-visible md:px-5 md:pb-5">
        {items.map((item) => {
          const isActive =
            pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`shrink-0 whitespace-nowrap rounded-xl px-3.5 py-2.5 text-sm transition md:px-4 md:py-3 ${
                isActive
                  ? "bg-[#d4a64a]/15 text-[#f4d28c] border border-[#d4a64a]/30"
                  : "border border-transparent text-slate-300 hover:border-white/15 hover:bg-white/5 hover:text-slate-100"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
