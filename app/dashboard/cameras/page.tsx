import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslator } from "@/lib/i18n/getTranslator";
import { getLocale } from "@/lib/i18n/server";
import { getSession } from "@/lib/auth/session";
import { listCameras } from "@/lib/dashboard/risk";
import { DeleteCameraButton } from "@/components/dashboard/DeleteCameraButton";

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
        <Link
          href="/dashboard/cameras/new"
          className="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-medium text-white shadow-[0_8px_20px_rgba(37,99,235,0.25)] transition hover:bg-accent/90"
        >
          {t("dashboard.addCamera")}
        </Link>
      </div>

      {cameraList.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-soft-border bg-surface-soft p-8 text-center">
          <p className="text-sm text-slate-500">{t("dashboard.camerasEmpty")}</p>
          <p className="mt-1 text-xs text-slate-400">{t("dashboard.camerasEmptyHint")}</p>
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:hidden">
            {cameraList.map((camera) => (
              <article key={camera.id} className="rounded-2xl border border-soft-border bg-white/80 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900">{camera.name}</p>
                    <p className="mt-0.5 text-xs text-slate-500">{camera.code}</p>
                  </div>
                  <span
                    className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] ${
                      camera.online ? "bg-emerald-500/15 text-emerald-700" : "bg-rose-500/15 text-rose-700"
                    }`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${camera.online ? "bg-emerald-500" : "bg-rose-500"}`} />
                    {camera.online ? t("dashboard.online") : t("dashboard.offline")}
                  </span>
                </div>
                <p className="mt-2 text-xs text-slate-600">{camera.location}</p>
                <div className="mt-3">
                  <DeleteCameraButton id={camera.id} label={t("dashboard.deleteCamera")} confirmText={t("dashboard.deleteCameraConfirm")} />
                </div>
              </article>
            ))}
          </div>

          <div className="hidden overflow-hidden rounded-2xl border border-soft-border bg-white/80 sm:block">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="border-b border-soft-border bg-slate-50 text-xs uppercase tracking-[0.14em] text-slate-500">
                  <tr>
                    <th className="px-4 py-3">{t("dashboard.thCamera")}</th>
                    <th className="px-4 py-3">{t("dashboard.thId")}</th>
                    <th className="px-4 py-3">{t("dashboard.thLocation")}</th>
                    <th className="px-4 py-3">{t("dashboard.thStatus")}</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {cameraList.map((camera) => (
                    <tr key={camera.id} className="border-b border-soft-border text-sm text-slate-800 last:border-b-0">
                      <td className="px-4 py-3">{camera.name}</td>
                      <td className="px-4 py-3 text-slate-600">{camera.code}</td>
                      <td className="px-4 py-3 text-slate-600">{camera.location}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs ${
                            camera.online ? "bg-emerald-500/15 text-emerald-700" : "bg-rose-500/15 text-rose-700"
                          }`}
                        >
                          <span className={`h-2 w-2 rounded-full ${camera.online ? "bg-emerald-500" : "bg-rose-500"}`} />
                          {camera.online ? t("dashboard.online") : t("dashboard.offline")}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <DeleteCameraButton id={camera.id} label={t("dashboard.deleteCamera")} confirmText={t("dashboard.deleteCameraConfirm")} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
