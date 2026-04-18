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
        <div className="flex-1">
          <header className="sticky top-0 z-20 flex items-center justify-between border-b border-white/10 bg-[#0b1a30]/95 px-4 py-3 backdrop-blur md:px-8">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Operations Dashboard</p>
              <p className="text-sm text-slate-200">{user?.email ?? "Signed in user"}</p>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/"
                className="rounded-lg border border-white/15 px-3 py-2 text-xs text-slate-300 transition hover:border-white/25 hover:text-slate-100"
              >
                Marketing Site
              </Link>
              <LogoutButton className="rounded-lg border border-[#d4a64a]/35 bg-[#d4a64a]/10 px-3 py-2 text-xs font-medium text-[#f4d28c] transition hover:bg-[#d4a64a]/20" />
            </div>
          </header>
          <main className="px-4 py-6 md:px-8 md:py-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
