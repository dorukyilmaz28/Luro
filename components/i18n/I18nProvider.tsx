"use client";

import type { Locale } from "@/lib/i18n/locale";
import { LOCALE_COOKIE } from "@/lib/i18n/locale";
import type { Translator } from "@/lib/i18n/getTranslator";
import { getTranslator } from "@/lib/i18n/getTranslator";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type I18nContextValue = {
  locale: Locale;
  t: Translator;
  setLocale: (next: Locale) => void;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({
  initialLocale,
  children,
}: {
  initialLocale: Locale;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  useEffect(() => {
    setLocaleState(initialLocale);
  }, [initialLocale]);

  useEffect(() => {
    document.documentElement.lang = locale === "en" ? "en" : "tr";
  }, [locale]);

  const t = useMemo(() => getTranslator(locale), [locale]);

  const setLocale = useCallback(
    (next: Locale) => {
      setLocaleState(next);
      document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; SameSite=Lax`;
      router.refresh();
    },
    [router],
  );

  const value = useMemo(() => ({ locale, t, setLocale }), [locale, t, setLocale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error("useI18n must be used within I18nProvider");
  }
  return ctx;
}
