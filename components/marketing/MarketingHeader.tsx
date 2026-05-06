"use client";

import type { User } from "@supabase/supabase-js";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { BrandLogo } from "@/components/BrandLogo";
import { createClient } from "@/lib/supabase/client";

type HeaderLink = {
  label: string;
  href: string;
  primary?: boolean;
};

type MarketingHeaderProps = {
  variant?: "landing" | "compact";
  navItems?: HeaderLink[];
  compactLinks?: HeaderLink[];
  ctaHref?: string;
  ctaLabel?: string;
};

function HeaderAnchor({ href, label, className }: { href: string; label: string; className: string }) {
  if (href.startsWith("#")) {
    return (
      <a href={href} className={className}>
        {label}
      </a>
    );
  }

  return (
    <Link href={href} className={className}>
      {label}
    </Link>
  );
}

function AuthActions({ user }: { user: User | null }) {
  if (user) {
    return (
      <>
        <Link
          href="/dashboard"
          className="rounded-xl border border-[#d4a64a]/45 bg-[#d4a64a]/10 px-3 py-2.5 text-xs font-medium text-[#d4a64a] transition-all duration-200 hover:bg-[#d4a64a]/20 sm:px-4 sm:text-sm"
        >
          Panel
        </Link>
        <LogoutButton className="rounded-xl border border-soft-border bg-white px-3 py-2.5 text-xs font-medium text-slate-700 transition-colors duration-200 hover:text-slate-900 sm:px-4 sm:text-sm" />
      </>
    );
  }

  return (
    <Link
      href="/login"
      className="rounded-xl border border-soft-border bg-white px-3 py-2.5 text-xs font-medium text-slate-700 transition-colors duration-200 hover:text-slate-900 sm:px-4 sm:text-sm"
    >
      Giriş Yap
    </Link>
  );
}

export function MarketingHeader({
  variant = "landing",
  navItems = [],
  compactLinks = [],
  ctaHref = "/demo",
  ctaLabel = "Demo Talep Et",
}: MarketingHeaderProps) {
  const [navOpen, setNavOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  const supabase = useMemo(() => {
    try {
      return createClient();
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    if (!supabase) return;

    let mounted = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!mounted) return;
      setUser(data.user ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    if (!navOpen) return;
    const onResize = () => {
      if (window.matchMedia("(min-width: 1024px)").matches) setNavOpen(false);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [navOpen]);

  return (
    <header className="sticky top-0 z-50 border-b border-soft-border/80 bg-[#FAF5EF]/95 backdrop-blur-md">
      <div className="mx-auto flex min-h-16 w-full max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6 md:min-h-24 md:px-10 md:py-0">
        <Link href="/" className="flex min-w-0 items-center gap-2 sm:gap-3">
          <BrandLogo priority={variant === "landing"} />
          <span className="text-xl font-medium tracking-tight sm:text-2xl">Luro</span>
        </Link>

        {variant === "landing" ? (
          <nav className="hidden items-center gap-6 xl:gap-8 lg:flex">
            {navItems.map((item) => (
              <HeaderAnchor
                key={item.href}
                href={item.href}
                label={item.label}
                className="text-sm text-slate-600 transition-colors duration-200 hover:text-slate-900"
              />
            ))}
          </nav>
        ) : null}

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          {variant === "compact"
            ? compactLinks.map((item) => (
                <HeaderAnchor
                  key={item.href}
                  href={item.href}
                  label={item.label}
                  className={
                    item.primary
                      ? "rounded-xl border border-[#0b1f3a]/15 bg-navy px-3 py-2.5 text-xs font-medium text-slate-50 transition-all duration-200 hover:bg-[#0f2a52] sm:px-5 sm:text-sm md:hover:-translate-y-0.5"
                      : "rounded-xl border border-soft-border bg-white px-3 py-2.5 text-xs text-slate-700 transition-colors hover:text-slate-900 sm:px-4 sm:text-sm"
                  }
                />
              ))
            : (
                <Link
                  href={ctaHref}
                  className="rounded-xl border border-[#0b1f3a]/15 bg-navy px-3 py-2.5 text-xs font-medium text-slate-50 transition-all duration-200 hover:bg-[#0f2a52] sm:px-5 sm:text-sm md:hover:-translate-y-0.5"
                >
                  <span className="sm:hidden">Demo</span>
                  <span className="hidden sm:inline">{ctaLabel}</span>
                </Link>
              )}

          <AuthActions user={user} />

          {variant === "landing" ? (
            <button
              type="button"
              className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-soft-border bg-white text-slate-800 lg:hidden"
              aria-expanded={navOpen}
              aria-controls="mobile-main-nav"
              aria-label={navOpen ? "Menüyü kapat" : "Menüyü aç"}
              onClick={() => setNavOpen((open) => !open)}
            >
              {navOpen ? (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          ) : null}
        </div>
      </div>

      {variant === "landing" ? (
        <nav
          id="mobile-main-nav"
          className={`border-t border-soft-border bg-[#FAF5EF] lg:hidden ${navOpen ? "block" : "hidden"}`}
          aria-hidden={!navOpen}
        >
          <div className="mx-auto max-w-6xl px-4 py-3 sm:px-6 md:px-10">
            <div className="flex flex-col">
              {navItems.map((item) => (
                <HeaderAnchor
                  key={item.href}
                  href={item.href}
                  label={item.label}
                  className="rounded-xl px-3 py-3 text-base text-slate-700 active:bg-surface-soft"
                />
              ))}
            </div>
          </div>
        </nav>
      ) : null}
    </header>
  );
}
