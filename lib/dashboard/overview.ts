import { and, desc, eq, gte, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { cameras, events } from "@/lib/db/schema";

export type DashboardStats = {
  totalCameras: number;
  activeAlerts: number;
  todaysIncidents: number;
  uptimePercent: number;
};

export async function getDashboardStats(userId: string): Promise<DashboardStats> {
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [cameraRows, todaysCount, activeAlertCount] = await Promise.all([
    db.select({ online: cameras.online }).from(cameras).where(eq(cameras.userId, userId)),
    db
      .select({ count: sql<number>`count(*)`.mapWith(Number) })
      .from(events)
      .innerJoin(cameras, eq(events.cameraId, cameras.id))
      .where(and(eq(cameras.userId, userId), gte(events.createdAt, since24h))),
    db
      .select({ count: sql<number>`count(*)`.mapWith(Number) })
      .from(events)
      .innerJoin(cameras, eq(events.cameraId, cameras.id))
      .where(
        and(
          eq(cameras.userId, userId),
          gte(events.createdAt, since24h),
          sql`${events.severity} in ('critical', 'high')`,
        ),
      ),
  ]);

  const totalCameras = cameraRows.length;
  const onlineCameras = cameraRows.filter((c) => c.online).length;
  const uptimePercent = totalCameras === 0 ? 100 : Math.round((onlineCameras / totalCameras) * 1000) / 10;

  return {
    totalCameras,
    activeAlerts: activeAlertCount[0]?.count ?? 0,
    todaysIncidents: todaysCount[0]?.count ?? 0,
    uptimePercent,
  };
}

export type RecentEvent = {
  id: string;
  eventType: string;
  severity: string;
  confidence: number | null;
  createdAt: string;
  cameraCode: string | null;
  cameraName: string | null;
  imageUrl: string | null;
  snapshotId: string | null;
};

export async function listRecentEvents(userId: string, limit = 12): Promise<RecentEvent[]> {
  const rows = await db
    .select({
      id: events.id,
      eventType: events.eventType,
      severity: events.severity,
      confidence: events.confidence,
      createdAt: events.createdAt,
      cameraCode: cameras.code,
      cameraName: cameras.name,
      imageUrl: events.imageUrl,
      snapshotId: events.snapshotId,
    })
    .from(events)
    .innerJoin(cameras, eq(events.cameraId, cameras.id))
    .where(eq(cameras.userId, userId))
    .orderBy(desc(events.createdAt))
    .limit(limit);

  return rows.map((row) => ({
    ...row,
    createdAt: row.createdAt.toISOString(),
  }));
}

export type EventTypeCount = { eventType: string; count: number };

export async function getEventTypeDistribution(userId: string, days = 7): Promise<EventTypeCount[]> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const rows = await db
    .select({
      eventType: events.eventType,
      count: sql<number>`count(*)`.mapWith(Number),
    })
    .from(events)
    .innerJoin(cameras, eq(events.cameraId, cameras.id))
    .where(and(eq(cameras.userId, userId), gte(events.createdAt, since)))
    .groupBy(events.eventType)
    .orderBy(desc(sql`count(*)`));
  return rows;
}

export type DailyEventCount = { day: string; count: number };

export async function getEventsOverTime(userId: string, days = 7): Promise<DailyEventCount[]> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const rows = await db
    .select({
      day: sql<string>`to_char(date_trunc('day', ${events.createdAt}), 'YYYY-MM-DD')`,
      count: sql<number>`count(*)`.mapWith(Number),
    })
    .from(events)
    .innerJoin(cameras, eq(events.cameraId, cameras.id))
    .where(and(eq(cameras.userId, userId), gte(events.createdAt, since)))
    .groupBy(sql`date_trunc('day', ${events.createdAt})`)
    .orderBy(sql`date_trunc('day', ${events.createdAt})`);

  // Fill in zero-count days so the chart shows a continuous window.
  const byDay = new Map(rows.map((row) => [row.day, row.count]));
  const series: DailyEventCount[] = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    const key = date.toISOString().slice(0, 10);
    series.push({ day: key, count: byDay.get(key) ?? 0 });
  }
  return series;
}
