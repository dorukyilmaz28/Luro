import { and, desc, eq, gte, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { cameras, events } from "@/lib/db/schema";
import type { Severity } from "./labels";

export type ReportData = {
  days: number;
  from: string;
  to: string;
  totalCameras: number;
  totalEvents: number;
  criticalCount: number;
  bySeverity: { severity: Severity; count: number }[];
  byType: { eventType: string; count: number }[];
  byCamera: { code: string; name: string; count: number }[];
  busiestDay: { day: string; count: number } | null;
};

export async function getReportData(userId: string, days = 7): Promise<ReportData> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const to = new Date();

  const [cameraCount, severityRows, typeRows, cameraRows, dayRows] = await Promise.all([
    db.select({ count: sql<number>`count(*)`.mapWith(Number) }).from(cameras).where(eq(cameras.userId, userId)),
    db
      .select({ severity: events.severity, count: sql<number>`count(*)`.mapWith(Number) })
      .from(events)
      .innerJoin(cameras, eq(events.cameraId, cameras.id))
      .where(and(eq(cameras.userId, userId), gte(events.createdAt, since)))
      .groupBy(events.severity),
    db
      .select({ eventType: events.eventType, count: sql<number>`count(*)`.mapWith(Number) })
      .from(events)
      .innerJoin(cameras, eq(events.cameraId, cameras.id))
      .where(and(eq(cameras.userId, userId), gte(events.createdAt, since)))
      .groupBy(events.eventType)
      .orderBy(desc(sql`count(*)`)),
    db
      .select({ code: cameras.code, name: cameras.name, count: sql<number>`count(*)`.mapWith(Number) })
      .from(events)
      .innerJoin(cameras, eq(events.cameraId, cameras.id))
      .where(and(eq(cameras.userId, userId), gte(events.createdAt, since)))
      .groupBy(cameras.code, cameras.name)
      .orderBy(desc(sql`count(*)`)),
    db
      .select({
        day: sql<string>`to_char(date_trunc('day', ${events.createdAt}), 'YYYY-MM-DD')`,
        count: sql<number>`count(*)`.mapWith(Number),
      })
      .from(events)
      .innerJoin(cameras, eq(events.cameraId, cameras.id))
      .where(and(eq(cameras.userId, userId), gte(events.createdAt, since)))
      .groupBy(sql`date_trunc('day', ${events.createdAt})`)
      .orderBy(desc(sql`count(*)`))
      .limit(1),
  ]);

  const bySeverity = severityRows.map((r) => ({ severity: r.severity as Severity, count: r.count }));
  const totalEvents = bySeverity.reduce((sum, r) => sum + r.count, 0);
  const criticalCount = bySeverity.find((r) => r.severity === "critical")?.count ?? 0;

  return {
    days,
    from: since.toISOString(),
    to: to.toISOString(),
    totalCameras: cameraCount[0]?.count ?? 0,
    totalEvents,
    criticalCount,
    bySeverity,
    byType: typeRows,
    byCamera: cameraRows,
    busiestDay: dayRows[0] ?? null,
  };
}
