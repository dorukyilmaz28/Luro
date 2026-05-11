import type { User } from "@supabase/supabase-js";
import Link from "next/link";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";
import { Sidebar } from "./Sidebar";

type DashboardLayoutProps = {
  children: React.ReactNode;
  user: User | null;
  eyebrow: string;
  homeLabel: string;
  sessionFallback: string;
};

export function DashboardLayout({ children, user, eyebrow, homeLabel, sessionFallback }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-[#FAF5EF] text-slate-900">
      <div className="md:flex">
        <Sidebar />
        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-20 border-b border-[#e6d9ca] bg-[#FAF5EF]/95 px-4 py-3 backdrop-blur md:px-8">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-[0.18em] text-[#9a762f]">{eyebrow}</p>
                <p className="truncate text-sm text-slate-600">{user?.email ?? sessionFallback}</p>
              </div>
              <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                <LanguageSwitcher compact className="border-[#d6c6b2] bg-white/70" />
                <Link
                  href="/"
                  className="rounded-lg border border-[#d6c6b2] bg-white/70 px-2.5 py-1.5 text-[11px] text-slate-600 transition hover:border-[#c3af97] hover:text-slate-900 sm:px-3 sm:py-2 sm:text-xs"
                >
                  {homeLabel}
                </Link>
                <LogoutButton className="rounded-lg border border-[#d4a64a]/45 bg-[#d4a64a]/10 px-2.5 py-1.5 text-[11px] font-medium text-[#8b6d2f] transition hover:bg-[#d4a64a]/20 sm:px-3 sm:py-2 sm:text-xs" />
              </div>
            </div>
          </header>
          <main className="px-3 py-5 sm:px-4 sm:py-6 md:px-8 md:py-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
