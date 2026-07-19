"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { useAuth, type AuthUser } from "@/components/auth/AuthProvider";
import { BrandLogo } from "@/components/BrandLogo";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";
import { useI18n } from "@/components/i18n/I18nProvider";

type HeaderLink = {
  label: string;
  href: string;
  primary?: boolean;
};

type MarketingHeaderProps = {
  variant?: "landing" | "compact";
  navItems?: HeaderLink[];
  compactLinks?: HeaderLink[];
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

function AuthActions({ user }: { user: AuthUser | null }) {
  const { t } = useI18n();
  if (user) {
    return (
      <>
        <Link
          href="/dashboard"
          className="rounded-full border border-accent/35 bg-accent/10 px-3 py-2.5 text-xs font-medium text-accent transition-all duration-200 hover:bg-accent/20 sm:px-4 sm:text-sm"
        >
          {t("common.panel")}
        </Link>
        <LogoutButton className="rounded-full border border-soft-border bg-white px-3 py-2.5 text-xs font-medium text-slate-700 transition-colors duration-200 hover:text-slate-900 sm:px-4 sm:text-sm" />
      </>
    );
  }

  return (
    <Link
      href="/login"
      className="rounded-full border border-soft-border bg-white px-3 py-2.5 text-xs font-medium text-slate-700 transition-colors duration-200 hover:text-slate-900 sm:px-4 sm:text-sm"
    >
      {t("common.login")}
    </Link>
  );
}

export function MarketingHeader({ variant = "landing", navItems = [], compactLinks = [] }: MarketingHeaderProps) {
  const { t } = useI18n();
  const [navOpen, setNavOpen] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (!navOpen) return;
    const onResize = () => {
      if (window.matchMedia("(min-width: 1024px)").matches) setNavOpen(false);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [navOpen]);

  return (
    <header className="sticky top-0 z-50 border-b border-soft-border/80 bg-background/95 backdrop-blur-md">
      <div className="mx-auto flex min-h-16 w-full max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6 md:min-h-24 md:px-10 md:py-0">
        <Link href="/" className="flex shrink-0 items-center gap-2 sm:gap-3">
          <BrandLogo priority={variant === "landing"} />
          <span className="font-display text-xl text-foreground sm:text-2xl">Luro</span>
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
          {variant === "compact" ? (
            <>
              {compactLinks
                .filter((item) => item.primary)
                .map((item) => (
                  <HeaderAnchor
                    key={item.href}
                    href={item.href}
                    label={item.label}
                    className="rounded-full border border-accent/15 bg-accent px-3 py-2.5 text-xs font-medium text-white transition-all duration-200 hover:bg-accent-strong sm:px-5 sm:text-sm md:hover:-translate-y-0.5"
                  />
                ))}
              <div className="hidden items-center gap-2 sm:flex sm:gap-3">
                {compactLinks
                  .filter((item) => !item.primary)
                  .map((item) => (
                    <HeaderAnchor
                      key={item.href}
                      href={item.href}
                      label={item.label}
                      className="rounded-full border border-soft-border bg-white px-3 py-2.5 text-xs text-slate-700 transition-colors hover:text-slate-900 sm:px-4 sm:text-sm"
                    />
                  ))}
              </div>
            </>
          ) : (
            <Link
              href="/demo"
              className="rounded-full border border-accent/15 bg-accent px-3 py-2.5 text-xs font-medium text-white transition-all duration-200 hover:bg-accent-strong sm:px-5 sm:text-sm md:hover:-translate-y-0.5"
            >
              <span className="sm:hidden">{t("header.demoShort")}</span>
              <span className="hidden sm:inline">{t("header.demoLong")}</span>
            </Link>
          )}

          <div className="hidden items-center gap-2 sm:flex sm:gap-3">
            <LanguageSwitcher compact />
            <AuthActions user={user} />
          </div>

          <button
            type="button"
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-soft-border bg-white text-slate-800 lg:hidden"
            aria-expanded={navOpen}
            aria-controls="mobile-main-nav"
            aria-label={navOpen ? t("header.menuClose") : t("header.menuOpen")}
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
        </div>
      </div>

      <nav
        id="mobile-main-nav"
        className={`border-t border-soft-border bg-background lg:hidden ${navOpen ? "block" : "hidden"}`}
        aria-hidden={!navOpen}
      >
        <div className="mx-auto max-w-6xl px-4 py-3 sm:px-6 md:px-10">
          <div className="flex flex-col">
            {(variant === "landing" ? navItems : compactLinks.filter((item) => !item.primary)).map((item) => (
              <HeaderAnchor
                key={item.href}
                href={item.href}
                label={item.label}
                className="rounded-xl px-3 py-3 text-base text-slate-700 active:bg-surface-soft"
              />
            ))}
          </div>
          <div className="mt-2 flex items-center gap-2 border-t border-soft-border pt-4 sm:hidden">
            <LanguageSwitcher compact />
            <AuthActions user={user} />
          </div>
        </div>
      </nav>
    </header>
  );
}
