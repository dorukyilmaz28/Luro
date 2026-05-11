"use client";

import type { Locale } from "@/lib/i18n/locale";
import { useI18n } from "./I18nProvider";

type LanguageSwitcherProps = {
  className?: string;
  compact?: boolean;
  /** Same outer width/height as marketing header buttons (Home, Demo, Sign in). */
  uniform?: boolean;
};

export function LanguageSwitcher({ className = "", compact = false, uniform = false }: LanguageSwitcherProps) {
  const { locale, setLocale, t } = useI18n();

  const base = uniform
    ? "box-border inline-flex h-10 max-h-10 min-h-10 w-[12rem] shrink-0 items-stretch gap-0.5 rounded-xl border border-soft-border bg-white/80 p-0.5 text-[11px] font-medium shadow-sm sm:h-11 sm:max-h-11 sm:min-h-11 sm:w-[13.5rem] sm:text-xs"
    : "inline-flex items-center rounded-lg border border-soft-border bg-white/80 p-0.5 text-[11px] font-medium shadow-sm sm:text-xs";

  const btn = (code: Locale, label: string) => (
    <button
      key={code}
      type="button"
      aria-pressed={locale === code}
      aria-label={label}
      onClick={() => setLocale(code)}
      className={`min-w-0 flex-1 rounded-md transition ${
        uniform ? "flex h-full min-h-0 items-center justify-center" : ""
      } ${
        locale === code
          ? "bg-navy text-slate-50 shadow-sm"
          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
      } ${uniform ? "" : "px-2 py-1 sm:px-2.5"}`}
    >
      {compact ? code.toUpperCase() : label}
    </button>
  );

  return (
    <div className={`${base} ${className}`} role="group" aria-label={t("common.language")}>
      {btn("tr", t("common.turkish"))}
      {btn("en", t("common.english"))}
    </div>
  );
}
