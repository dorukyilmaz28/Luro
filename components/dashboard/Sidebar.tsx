"use client";

import { useI18n } from "@/components/i18n/I18nProvider";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/dashboard", key: "dashboard.navOverview" as const },
  { href: "/dashboard/alerts", key: "dashboard.navAlerts" as const },
  { href: "/dashboard/cameras", key: "dashboard.navCameras" as const },
  { href: "/dashboard/risk", key: "dashboard.navRisk" as const },
  { href: "/dashboard/ai-training", key: "dashboard.navAiTraining" as const },
  { href: "/dashboard/analytics", key: "dashboard.navAnalytics" as const },
  { href: "/dashboard/settings", key: "dashboard.navSettings" as const },
];

export function Sidebar() {
  const pathname = usePathname();
  const { t } = useI18n();

  return (
    <aside className="w-full shrink-0 border-b border-soft-border bg-surface-soft md:min-h-screen md:w-56 md:border-b-0 md:border-r lg:w-64">
      <div className="flex items-center justify-between px-4 py-3 md:block md:p-5">
        <p className="font-display text-sm text-foreground">{t("dashboard.sidebarTitle")}</p>
      </div>
      <nav className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-col md:gap-2 md:overflow-x-visible md:px-5 md:pb-5">
        {NAV.map((item) => {
          const isActive =
            pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`shrink-0 whitespace-nowrap rounded-xl px-3.5 py-2.5 text-sm transition md:px-4 md:py-3 ${
                isActive
                  ? "border border-accent/30 bg-accent/10 text-accent"
                  : "border border-transparent text-slate-600 hover:border-soft-border hover:bg-white hover:text-foreground"
              }`}
            >
              {t(item.key)}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
