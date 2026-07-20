import { and, desc, eq, gte, isNull, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { cameras, events, proactiveSuggestions } from "@/lib/db/schema";
import type { Locale } from "@/lib/i18n/locale";

export type Severity = "critical" | "high" | "medium" | "low";

const SEVERITY_WEIGHT: Record<Severity, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

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

function windowStart(windowMinutes: number): Date {
  return new Date(Date.now() - windowMinutes * 60 * 1000);
}

export async function listCameraRiskScores(
  userId: string,
  windowMinutes: number = RISK_WINDOWS.day,
): Promise<CameraRiskScore[]> {
  const since = windowStart(windowMinutes);
  const rows = await db
    .select({
      cameraId: events.cameraId,
      eventType: events.eventType,
      severity: events.severity,
      count: sql<number>`count(*)`.mapWith(Number),
    })
    .from(events)
    .innerJoin(cameras, eq(events.cameraId, cameras.id))
    .where(and(gte(events.createdAt, since), eq(cameras.userId, userId)))
    .groupBy(events.cameraId, events.eventType, events.severity);

  const byCamera = new Map<string, { score: number; eventCount: number; topType: string | null; topSeverity: Severity | null; topCount: number }>();

  for (const row of rows) {
    if (!row.cameraId) continue;
    const entry = byCamera.get(row.cameraId) ?? { score: 0, eventCount: 0, topType: null, topSeverity: null, topCount: 0 };
    const weight = SEVERITY_WEIGHT[row.severity as Severity] ?? 1;
    entry.score += weight * row.count;
    entry.eventCount += row.count;
    if (row.count > entry.topCount) {
      entry.topCount = row.count;
      entry.topType = row.eventType;
      entry.topSeverity = row.severity as Severity;
    }
    byCamera.set(row.cameraId, entry);
  }

  return Array.from(byCamera.entries())
    .map(([cameraId, entry]) => ({
      camera_id: cameraId,
      score: entry.score,
      event_count: entry.eventCount,
      top_event_type: entry.topType,
      top_severity: entry.topSeverity,
    }))
    .sort((a, b) => b.score - a.score);
}

export async function getGlobalRiskScore(
  userId: string,
  windowMinutes: number = RISK_WINDOWS.day,
): Promise<GlobalRiskScore> {
  const cameraScores = await listCameraRiskScores(userId, windowMinutes);
  return {
    total_score: cameraScores.reduce((sum, c) => sum + c.score, 0),
    camera_count: cameraScores.length,
    event_count: cameraScores.reduce((sum, c) => sum + c.event_count, 0),
  };
}

export async function getEventHeatmap(userId: string, options: { since?: Date } = {}): Promise<HeatmapRow[]> {
  const since = options.since ?? windowStart(RISK_WINDOWS.week);

  const rows = await db
    .select({
      cameraId: events.cameraId,
      eventType: events.eventType,
      bucketHour: sql<string>`date_trunc('hour', ${events.createdAt})`,
      hourOfDay: sql<number>`extract(hour from ${events.createdAt})`.mapWith(Number),
      count: sql<number>`count(*)`.mapWith(Number),
    })
    .from(events)
    .innerJoin(cameras, eq(events.cameraId, cameras.id))
    .where(and(gte(events.createdAt, since), eq(cameras.userId, userId)))
    .groupBy(events.cameraId, events.eventType, sql`date_trunc('hour', ${events.createdAt})`, sql`extract(hour from ${events.createdAt})`)
    .orderBy(sql`date_trunc('hour', ${events.createdAt})`);

  return rows.map((row) => ({
    camera_id: row.cameraId as string,
    event_type: row.eventType,
    bucket_hour: new Date(row.bucketHour).toISOString(),
    hour_of_day: row.hourOfDay,
    event_count: row.count,
  }));
}

export async function listSuggestions(userId: string): Promise<SuggestionRow[]> {
  const rows = await db
    .select()
    .from(proactiveSuggestions)
    .where(and(eq(proactiveSuggestions.userId, userId), isNull(proactiveSuggestions.dismissedAt)))
    .orderBy(desc(proactiveSuggestions.createdAt));

  return rows.map((row) => ({
    id: row.id,
    user_id: row.userId,
    camera_id: row.cameraId,
    kind: row.kind,
    severity: row.severity as Severity,
    title: row.title,
    body: row.body,
    evidence: (row.evidence as Record<string, unknown>) ?? {},
    created_at: row.createdAt.toISOString(),
    dismissed_at: row.dismissedAt ? row.dismissedAt.toISOString() : null,
  }));
}

export async function dismissSuggestion(userId: string, suggestionId: string): Promise<void> {
  await db
    .update(proactiveSuggestions)
    .set({ dismissedAt: new Date() })
    .where(and(eq(proactiveSuggestions.id, suggestionId), eq(proactiveSuggestions.userId, userId)));
}

const SUGGESTION_TRIGGER_COUNT = 3;
const SUGGESTION_WINDOW_MINUTES = RISK_WINDOWS.day;

/**
 * Rule-based suggestion generator: if a camera has 3+ high/critical events of the
 * same type within the window and no undismissed suggestion for that camera+kind
 * already exists, create one. Replaces the old Supabase `recompute_proactive_suggestions`
 * RPC (whose SQL wasn't version-controlled) with a plain, readable TS implementation.
 */
export async function recomputeSuggestions(userId: string): Promise<number> {
  const since = windowStart(SUGGESTION_WINDOW_MINUTES);

  const rows = await db
    .select({
      cameraId: events.cameraId,
      eventType: events.eventType,
      severity: events.severity,
      count: sql<number>`count(*)`.mapWith(Number),
    })
    .from(events)
    .innerJoin(cameras, eq(events.cameraId, cameras.id))
    .where(and(gte(events.createdAt, since), eq(cameras.userId, userId), sql`${events.severity} in ('critical', 'high')`))
    .groupBy(events.cameraId, events.eventType, events.severity)
    .having(sql`count(*) >= ${SUGGESTION_TRIGGER_COUNT}`);

  const existing = await db
    .select({ cameraId: proactiveSuggestions.cameraId, kind: proactiveSuggestions.kind })
    .from(proactiveSuggestions)
    .where(and(eq(proactiveSuggestions.userId, userId), isNull(proactiveSuggestions.dismissedAt)));
  const existingKeys = new Set(existing.map((e) => `${e.cameraId}:${e.kind}`));

  let created = 0;
  for (const row of rows) {
    if (!row.cameraId) continue;
    const kind = `repeated_${row.eventType}`;
    const key = `${row.cameraId}:${kind}`;
    if (existingKeys.has(key)) continue;

    await db.insert(proactiveSuggestions).values({
      userId,
      cameraId: row.cameraId,
      kind,
      severity: row.severity as Severity,
      title: `Tekrarlanan ${row.eventType} olayı`,
      body: `Son 24 saatte bu kamerada ${row.count} kez "${row.eventType}" olayı tespit edildi.`,
      evidence: { event_type: row.eventType, count: row.count, window_minutes: SUGGESTION_WINDOW_MINUTES },
    });
    created += 1;
  }

  return created;
}

export async function listCameras(userId: string) {
  return db.select().from(cameras).where(eq(cameras.userId, userId)).orderBy(desc(cameras.createdAt));
}

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
