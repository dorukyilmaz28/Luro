import type { SupabaseClient } from "@supabase/supabase-js";

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

export async function listCameraRiskScores(
  supabase: SupabaseClient,
  windowMinutes: number = RISK_WINDOWS.day,
): Promise<CameraRiskScore[]> {
  const { data, error } = await supabase.rpc("camera_risk_scores", {
    window_minutes: windowMinutes,
  });
  if (error) throw new Error(error.message);
  return (data ?? []) as CameraRiskScore[];
}

export async function getGlobalRiskScore(
  supabase: SupabaseClient,
  windowMinutes: number = RISK_WINDOWS.day,
): Promise<GlobalRiskScore> {
  const { data, error } = await supabase.rpc("global_risk_score", {
    window_minutes: windowMinutes,
  });
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as GlobalRiskScore[];
  return rows[0] ?? { total_score: 0, camera_count: 0, event_count: 0 };
}

export async function getEventHeatmap(
  supabase: SupabaseClient,
  options: { since?: Date } = {},
): Promise<HeatmapRow[]> {
  const since = options.since ?? new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const { data, error } = await supabase
    .from("event_heatmap_daily")
    .select("camera_id, event_type, bucket_hour, hour_of_day, event_count")
    .gte("bucket_hour", since.toISOString())
    .order("bucket_hour", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as HeatmapRow[];
}

export async function listSuggestions(
  supabase: SupabaseClient,
): Promise<SuggestionRow[]> {
  const { data, error } = await supabase
    .from("proactive_suggestions")
    .select("*")
    .is("dismissed_at", null)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as SuggestionRow[];
}

export async function dismissSuggestion(
  supabase: SupabaseClient,
  suggestionId: string,
): Promise<void> {
  const { error } = await supabase
    .from("proactive_suggestions")
    .update({ dismissed_at: new Date().toISOString() })
    .eq("id", suggestionId);
  if (error) throw new Error(error.message);
}

export async function recomputeSuggestions(
  supabase: SupabaseClient,
): Promise<number> {
  const { data, error } = await supabase.rpc("recompute_proactive_suggestions");
  if (error) throw new Error(error.message);
  return typeof data === "number" ? data : 0;
}

/**
 * Aggregates a heatmap row list into a camera Ã— event_type matrix.
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

const EVENT_TYPE_LABELS: Record<string, string> = {
  fire_smoke: "YangÄ±n / Duman",
  unsafe_proximity: "YakÄ±nlÄ±k Riski",
  restricted_zone_entry: "YasaklÄ± BÃ¶lge",
  no_hardhat: "Baret Eksik",
  no_vest: "Yelek Eksik",
};

export function eventTypeLabel(eventType: string): string {
  return EVENT_TYPE_LABELS[eventType] ?? eventType;
}

const SEVERITY_LABELS: Record<Severity, string> = {
  critical: "Kritik",
  high: "YÃ¼ksek",
  medium: "Orta",
  low: "DÃ¼ÅŸÃ¼k",
};

export function severityLabel(severity: Severity | null): string {
  if (!severity) return "â€”";
  return SEVERITY_LABELS[severity];
}
