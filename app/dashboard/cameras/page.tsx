import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslator } from "@/lib/i18n/getTranslator";
import { getLocale } from "@/lib/i18n/server";
import { getSession } from "@/lib/auth/session";
import { listCameras } from "@/lib/dashboard/risk";
import { CameraCard } from "@/components/dashboard/CameraCard";
import { AutoRefresh } from "@/components/dashboard/AutoRefresh";

export default async function CamerasPage() {
  const locale = await getLocale();
  const t = getTranslator(locale);
  const user = await getSession();
  if (!user) redirect("/login");

  const cameraList = await listCameras(user.id);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-accent">{t("dashboard.camerasEyebrow")}</p>
          <h1 className="mt-2 text-2xl font-medium tracking-tight text-slate-900">{t("dashboard.camerasTitle")}</h1>
        </div>
        <div className="flex items-center gap-3">
          <AutoRefresh />
          <Link
            href="/dashboard/cameras/new"
            className="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-medium text-white shadow-[0_8px_20px_rgba(37,99,235,0.25)] transition hover:bg-accent/90"
          >
            {t("dashboard.addCamera")}
          </Link>
        </div>
      </div>

      {cameraList.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-soft-border bg-surface-soft p-8 text-center">
          <p className="text-sm text-slate-500">{t("dashboard.camerasEmpty")}</p>
          <p className="mt-1 text-xs text-slate-400">{t("dashboard.camerasEmptyHint")}</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {cameraList.map((camera) => (
            <CameraCard
              key={camera.id}
              camera={{
                id: camera.id,
                code: camera.code,
                name: camera.name,
                location: camera.location,
                online: camera.online,
                detectionEnabled: camera.detectionEnabled,
                hasLive: Boolean(camera.liveSnapshotId),
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
