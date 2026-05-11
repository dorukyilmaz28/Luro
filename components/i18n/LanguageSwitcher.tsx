"use client";

import type { Locale } from "@/lib/i18n/locale";
import { useI18n } from "./I18nProvider";

type LanguageSwitcherProps = {
  className?: string;
  compact?: boolean;
};

export function LanguageSwitcher({ className = "", compact = false }: LanguageSwitcherProps) {
  const { locale, setLocale, t } = useI18n();

  const base =
    "inline-flex items-center rounded-lg border border-soft-border bg-white/80 p-0.5 text-[11px] font-medium shadow-sm sm:text-xs";

  const btn = (code: Locale, label: string) => (
    <button
      key={code}
      type="button"
      aria-pressed={locale === code}
      aria-label={label}
      onClick={() => setLocale(code)}
      className={`rounded-md px-2 py-1 transition sm:px-2.5 ${
        locale === code
          ? "bg-navy text-slate-50 shadow-sm"
          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
      }`}
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
