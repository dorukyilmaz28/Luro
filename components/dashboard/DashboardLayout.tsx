import Link from "next/link";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";
import type { SessionUser } from "@/lib/auth/session";
import { Sidebar } from "./Sidebar";

type DashboardLayoutProps = {
  children: React.ReactNode;
  user: SessionUser | null;
  eyebrow: string;
  homeLabel: string;
  sessionFallback: string;
};

export function DashboardLayout({ children, user, eyebrow, homeLabel, sessionFallback }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="md:flex">
        <Sidebar />
        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-20 border-b border-soft-border bg-background/95 px-4 py-3 backdrop-blur md:px-8">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-[0.18em] text-accent">{eyebrow}</p>
                <p className="truncate text-sm text-slate-600">{user?.email ?? sessionFallback}</p>
              </div>
              <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                <LanguageSwitcher compact />
                <Link
                  href="/"
                  className="rounded-full border border-soft-border bg-white px-2.5 py-1.5 text-[11px] text-slate-600 transition hover:border-accent/40 hover:text-foreground sm:px-3 sm:py-2 sm:text-xs"
                >
                  {homeLabel}
                </Link>
                <LogoutButton className="rounded-full border border-accent/35 bg-accent/10 px-2.5 py-1.5 text-[11px] font-medium text-accent transition hover:bg-accent/20 sm:px-3 sm:py-2 sm:text-xs" />
              </div>
            </div>
          </header>
          <main className="px-3 py-5 sm:px-4 sm:py-6 md:px-8 md:py-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
