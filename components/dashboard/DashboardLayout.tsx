import type { User } from "@supabase/supabase-js";
import Link from "next/link";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { Sidebar } from "./Sidebar";

type DashboardLayoutProps = {
  children: React.ReactNode;
  user: User | null;
};

export function DashboardLayout({ children, user }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-[#081427] text-slate-100">
      <div className="md:flex">
        <Sidebar />
        <div className="flex-1 min-w-0">
          <header className="sticky top-0 z-20 border-b border-white/10 bg-[#0b1a30]/95 px-4 py-3 backdrop-blur md:px-8">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Operasyon Paneli</p>
                <p className="truncate text-sm text-slate-200">{user?.email ?? "Oturum açık"}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Link
                  href="/"
                  className="rounded-lg border border-white/15 px-2.5 py-1.5 text-[11px] text-slate-300 transition hover:border-white/25 hover:text-slate-100 sm:px-3 sm:py-2 sm:text-xs"
                >
                  Ana Sayfa
                </Link>
                <LogoutButton className="rounded-lg border border-[#d4a64a]/35 bg-[#d4a64a]/10 px-2.5 py-1.5 text-[11px] font-medium text-[#f4d28c] transition hover:bg-[#d4a64a]/20 sm:px-3 sm:py-2 sm:text-xs" />
              </div>
            </div>
          </header>
          <main className="px-3 py-5 sm:px-4 sm:py-6 md:px-8 md:py-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
