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
    <aside className="w-full border-b border-white/10 bg-[#0d1e36] p-5 md:min-h-screen md:w-64 md:border-b-0 md:border-r">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#d4a64a]">Luro Konsol</p>
      <nav className="mt-5 grid gap-2">
        {items.map((item) => {
          const isActive =
            pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-xl px-4 py-3 text-sm transition ${
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
