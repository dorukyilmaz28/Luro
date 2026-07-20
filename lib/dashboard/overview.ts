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
