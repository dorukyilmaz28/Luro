import type { Locale } from "./locale";

const CHART_DAY_TR_TO_EN: Record<string, string> = {
  Pzt: "Mon",
  Sal: "Tue",
  Çar: "Wed",
  Per: "Thu",
  Cum: "Fri",
  Cmt: "Sat",
  Paz: "Sun",
};

/** Localize abbreviated weekday labels used in mock chart data. */
export function localizeChartDayLabel(day: string, locale: Locale): string {
  if (locale === "tr") return day;
  return CHART_DAY_TR_TO_EN[day] ?? day;
}

const MOCK_LABEL_TR_TO_EN: Record<string, string> = {
  "Baret Eksikliği": "Missing hard hat",
  "Yelek Eksikliği": "Missing safety vest",
  "Yasaklı Bölge Girişi": "Restricted zone entry",
  "Forklift Yakınlık Riski": "Forklift proximity risk",
  "Yasaklı Bölge": "Restricted zone",
  "Yakınlık Riski": "Proximity risk",
  "Depo Girişi": "Warehouse entrance",
  "Yükleme Rampası": "Loading ramp",
  "Üretim Hattı": "Production line",
  "Forklift Koridoru": "Forklift corridor",
  "Yasaklı Alan": "Restricted area",
  "İstanbul - Kapı A": "Istanbul — Gate A",
  "İstanbul - Dok 3": "Istanbul — Dock 3",
  "Bursa - Hat 2": "Bursa — Line 2",
  "Ankara - Bölge B": "Ankara — Zone B",
  "İzmir - Bölge D": "Izmir — Zone D",
};

/** Localize user-visible mock strings (events, cameras) for EN without changing source data. */
export function localizeMockCopy(text: string, locale: Locale): string {
  if (locale === "tr") return text;
  return MOCK_LABEL_TR_TO_EN[text] ?? text;
}

export function chartLocaleTag(locale: Locale): string {
  return locale === "en" ? "en-US" : "tr-TR";
}
