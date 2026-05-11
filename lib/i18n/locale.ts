export const LOCALE_COOKIE = "luro_locale";

export type Locale = "tr" | "en";

export const DEFAULT_LOCALE: Locale = "tr";

export function parseLocale(value: string | undefined | null): Locale {
  return value === "en" ? "en" : "tr";
}
