import type { Locale } from "@/lib/i18n/locale";

// Pure types/helpers shared by server queries (risk.ts) and client components.
// Must never import the DB client — client bundles include this module.

export type Severity = "critical" | "high" | "medium" | "low";

export type CameraRiskScore = {
  camera_id: string;
  score: number;
  event_count: number;
  top_event_type: string | null;
  top_severity: Severity | null;
};

export type GlobalRiskScore = {
  total_score: number;
  camera_count: number;
  event_count: number;
};

export type HeatmapRow = {
  camera_id: string;
  event_type: string;
  bucket_hour: string;
  hour_of_day: number;
  event_count: number;
};

export type SuggestionRow = {
  id: string;
  user_id: string;
  camera_id: string | null;
  kind: string;
  severity: Severity;
  title: string;
  body: string;
  evidence: Record<string, unknown>;
  created_at: string;
  dismissed_at: string | null;
};

export const RISK_WINDOWS = {
  hour: 60,
  day: 24 * 60,
  week: 7 * 24 * 60,
} as const;

export type RiskWindowKey = keyof typeof RISK_WINDOWS;

/**
 * Aggregates a heatmap row list into a camera × event_type matrix.
 * Returns row labels (cameras), column labels (event types), and counts[row][col].
 */
export function aggregateHeatmapMatrix(rows: HeatmapRow[]): {
  cameras: string[];
  eventTypes: string[];
  counts: number[][];
  max: number;
} {
  const cameras = Array.from(new Set(rows.map((r) => r.camera_id))).sort();
  const eventTypes = Array.from(new Set(rows.map((r) => r.event_type))).sort();
  const counts: number[][] = cameras.map(() => eventTypes.map(() => 0));
  let max = 0;
  for (const r of rows) {
    const ri = cameras.indexOf(r.camera_id);
    const ci = eventTypes.indexOf(r.event_type);
    if (ri < 0 || ci < 0) continue;
    counts[ri][ci] += r.event_count;
    if (counts[ri][ci] > max) max = counts[ri][ci];
  }
  return { cameras, eventTypes, counts, max };
}

const EVENT_TYPE_LABELS: Record<Locale, Record<string, string>> = {
  tr: {
    fire_smoke: "Yangın / Duman",
    unsafe_proximity: "Yakınlık riski",
    restricted_zone_entry: "Yasaklı bölge",
    no_hardhat: "Baret eksik",
    no_vest: "Yelek eksik",
    no_safety_vest: "Yelek eksik",
    no_safety_gloves: "Eldiven eksik",
    no_safety_boots: "Bot eksik",
    no_safety_goggles: "Gözlük eksik",
    person_fall_suspected: "Olası düşme",
  },
  en: {
    fire_smoke: "Fire / smoke",
    unsafe_proximity: "Proximity risk",
    restricted_zone_entry: "Restricted zone",
    no_hardhat: "Missing hard hat",
    no_vest: "Missing safety vest",
    no_safety_vest: "Missing safety vest",
    no_safety_gloves: "Missing gloves",
    no_safety_boots: "Missing boots",
    no_safety_goggles: "Missing goggles",
    person_fall_suspected: "Possible fall",
  },
};

export function eventTypeLabel(eventType: string, locale: Locale = "tr"): string {
  return EVENT_TYPE_LABELS[locale][eventType] ?? eventType;
}

const SEVERITY_LABELS: Record<Locale, Record<Severity, string>> = {
  tr: {
    critical: "Kritik",
    high: "Yüksek",
    medium: "Orta",
    low: "Düşük",
  },
  en: {
    critical: "Critical",
    high: "High",
    medium: "Medium",
    low: "Low",
  },
};

const SEVERITY_EMPTY: Record<Locale, string> = {
  tr: "—",
  en: "—",
};

export function severityLabel(severity: Severity | null, locale: Locale = "tr"): string {
  if (!severity) return SEVERITY_EMPTY[locale];
  return SEVERITY_LABELS[locale][severity];
}
