import Link from "next/link";
import { redirect } from "next/navigation";
import { and, desc, eq, isNotNull } from "drizzle-orm";
import { getSession } from "@/lib/auth/session";
import { getTranslator } from "@/lib/i18n/getTranslator";
import { getLocale } from "@/lib/i18n/server";
import { db } from "@/lib/db/client";
import { cameras, events, zones } from "@/lib/db/schema";
import { ZoneEditor } from "@/components/dashboard/ZoneEditor";

export default async function CameraZonesPage({ params }: { params: Promise<{ id: string }> }) {
  const t = getTranslator(await getLocale());
  const user = await getSession();
  if (!user) redirect("/login");

  const { id } = await params;

  const [camera] = await db
    .select({ id: cameras.id, name: cameras.name, code: cameras.code })
    .from(cameras)
    .where(and(eq(cameras.id, id), eq(cameras.userId, user.id)))
    .limit(1);
  if (!camera) redirect("/dashboard/cameras");

  const [latestSnap] = await db
    .select({ snapshotId: events.snapshotId })
    .from(events)
    .where(and(eq(events.cameraId, id), isNotNull(events.snapshotId)))
    .orderBy(desc(events.createdAt))
    .limit(1);

  const zoneRows = await db
    .select({ id: zones.id, name: zones.name, type: zones.type, polygon: zones.polygon })
    .from(zones)
    .where(eq(zones.cameraId, id))
    .orderBy(desc(zones.createdAt));

  return (
    <div className="space-y-5">
      <div>
        <Link href="/dashboard/cameras" className="text-xs font-medium text-accent">
          {t("dashboard.backToCameras")}
        </Link>
        <p className="mt-3 text-xs uppercase tracking-[0.18em] text-accent">{t("dashboard.zonesEyebrow")}</p>
        <h1 className="mt-2 text-2xl font-medium tracking-tight text-slate-900">
          {camera.name} · {t("dashboard.zonesTitle")}
        </h1>
        <p className="mt-1 text-sm text-slate-600">{t("dashboard.zonesIntro")}</p>
      </div>

      <ZoneEditor
        cameraId={camera.id}
        snapshotId={latestSnap?.snapshotId ?? null}
        initialZones={zoneRows.map((z) => ({ ...z, polygon: z.polygon }))}
      />
    </div>
  );
}
