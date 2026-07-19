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
    "inline-flex items-center rounded-full border border-soft-border bg-white p-1 text-xs font-medium shadow-sm";

  const btn = (code: Locale, label: string) => (
    <button
      key={code}
      type="button"
      aria-pressed={locale === code}
      aria-label={label}
      onClick={() => setLocale(code)}
      className={`rounded-full px-3 py-1.5 transition sm:px-3.5 ${
        locale === code
          ? "bg-accent text-white shadow-sm"
          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
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
