import { localizeMockCopy } from "@/lib/i18n/display";
import { getTranslator } from "@/lib/i18n/getTranslator";
import { getLocale } from "@/lib/i18n/server";
import { cameraList } from "@/lib/mock/dashboard";

export default async function CamerasPage() {
  const locale = await getLocale();
  const t = getTranslator(locale);

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs uppercase tracking-[0.18em] text-[#d4a64a]">{t("dashboard.camerasEyebrow")}</p>
        <h1 className="mt-2 text-2xl font-medium tracking-tight text-slate-900">{t("dashboard.camerasTitle")}</h1>
      </div>

      <div className="grid gap-3 sm:hidden">
        {cameraList.map((camera) => (
          <article key={camera.id} className="rounded-2xl border border-[#e6d9ca] bg-white/80 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-900">{localizeMockCopy(camera.name, locale)}</p>
                <p className="mt-0.5 text-xs text-slate-500">{camera.id}</p>
              </div>
              <span
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] ${
                  camera.status === "online"
                    ? "bg-emerald-500/15 text-emerald-300"
                    : "bg-rose-500/15 text-rose-300"
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    camera.status === "online" ? "bg-emerald-300" : "bg-rose-300"
                  }`}
                />
                {camera.status === "online" ? t("dashboard.online") : t("dashboard.offline")}
              </span>
            </div>
            <p className="mt-2 text-xs text-slate-600">{localizeMockCopy(camera.location, locale)}</p>
          </article>
        ))}
      </div>

      <div className="hidden overflow-hidden rounded-2xl border border-[#e6d9ca] bg-white/80 sm:block">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="border-b border-[#e6d9ca] bg-[#f8f3ec] text-xs uppercase tracking-[0.14em] text-slate-500">
              <tr>
                <th className="px-4 py-3">{t("dashboard.thCamera")}</th>
                <th className="px-4 py-3">{t("dashboard.thId")}</th>
                <th className="px-4 py-3">{t("dashboard.thLocation")}</th>
                <th className="px-4 py-3">{t("dashboard.thStatus")}</th>
              </tr>
            </thead>
            <tbody>
              {cameraList.map((camera) => (
                <tr key={camera.id} className="border-b border-[#f0e5d8] text-sm text-slate-800 last:border-b-0">
                  <td className="px-4 py-3">{localizeMockCopy(camera.name, locale)}</td>
                  <td className="px-4 py-3 text-slate-600">{camera.id}</td>
                  <td className="px-4 py-3 text-slate-600">{localizeMockCopy(camera.location, locale)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs ${
                        camera.status === "online"
                          ? "bg-emerald-500/15 text-emerald-300"
                          : "bg-rose-500/15 text-rose-300"
                      }`}
                    >
                      <span
                        className={`h-2 w-2 rounded-full ${
                          camera.status === "online" ? "bg-emerald-300" : "bg-rose-300"
                        }`}
                      />
                      {camera.status === "online" ? t("dashboard.online") : t("dashboard.offline")}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
