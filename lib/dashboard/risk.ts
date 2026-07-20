import { and, desc, eq, gte, isNull, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { cameras, events, proactiveSuggestions } from "@/lib/db/schema";
import { RISK_WINDOWS } from "./labels";
import type { CameraRiskScore, GlobalRiskScore, HeatmapRow, Severity, SuggestionRow } from "./labels";

// Pure types and label helpers live in ./labels (safe for client bundles).
// Re-exported here so existing server-side imports keep working.
export * from "./labels";

const SEVERITY_WEIGHT: Record<Severity, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

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
