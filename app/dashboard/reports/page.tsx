import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getTranslator } from "@/lib/i18n/getTranslator";
import { getLocale } from "@/lib/i18n/server";
import { chartLocaleTag } from "@/lib/i18n/display";
import { getReportData } from "@/lib/dashboard/report";
import { eventTypeLabel, severityLabel, type Severity } from "@/lib/dashboard/labels";
import { PrintButton } from "@/components/dashboard/PrintButton";

const SEVERITY_ORDER: Severity[] = ["critical", "high", "medium", "low"];
const SEVERITY_TONE: Record<Severity, string> = {
  critical: "text-rose-700",
  high: "text-orange-600",
  medium: "text-amber-600",
  low: "text-emerald-600",
};

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  const user = await getSession();
  if (!user) redirect("/login");

  const locale = await getLocale();
  const t = getTranslator(locale);
  const sp = await searchParams;
  const days = sp.days === "30" ? 30 : 7;

  const data = await getReportData(user.id, days);

  const fmtDate = (iso: string) =>
    new Intl.DateTimeFormat(chartLocaleTag(locale), { dateStyle: "medium" }).format(new Date(iso));
  const maxType = Math.max(...data.byType.map((r) => r.count), 1);
  const severityMap = new Map(data.bySeverity.map((r) => [r.severity, r.count]));

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <style>{`@media print { aside, header, .no-print { display: none !important; } main { padding: 0 !important; } body { background: #fff !important; } }`}</style>

      <div className="flex flex-wrap items-center justify-between gap-3 no-print">
        <div className="inline-flex rounded-full border border-soft-border bg-white p-1 text-sm">
          <Link
            href="/dashboard/reports?days=7"
            className={`rounded-full px-3 py-1.5 ${days === 7 ? "bg-accent text-white" : "text-slate-600"}`}
          >
            {t("dashboard.reportLast7")}
          </Link>
          <Link
            href="/dashboard/reports?days=30"
            className={`rounded-full px-3 py-1.5 ${days === 30 ? "bg-accent text-white" : "text-slate-600"}`}
          >
            {t("dashboard.reportLast30")}
          </Link>
        </div>
        <PrintButton />
      </div>

      <article className="space-y-6 rounded-2xl border border-soft-border bg-white p-6 sm:p-8">
        <header className="border-b border-soft-border pb-4">
          <p className="text-xs uppercase tracking-[0.2em] text-accent">Luro · {t("dashboard.reportEyebrow")}</p>
          <h1 className="mt-2 text-2xl font-medium tracking-tight text-slate-900">{t("dashboard.reportTitle")}</h1>
          <p className="mt-1 text-sm text-slate-600">
            {user.companyName || "—"} · {fmtDate(data.from)} – {fmtDate(data.to)}
          </p>
        </header>

        <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <p className="text-2xl font-semibold text-slate-900">{data.totalEvents}</p>
            <p className="text-xs text-slate-500">{t("dashboard.reportTotalEvents")}</p>
          </div>
          <div>
            <p className="text-2xl font-semibold text-rose-700">{data.criticalCount}</p>
            <p className="text-xs text-slate-500">{t("dashboard.reportCritical")}</p>
          </div>
          <div>
            <p className="text-2xl font-semibold text-slate-900">{data.totalCameras}</p>
            <p className="text-xs text-slate-500">{t("dashboard.reportCameras")}</p>
          </div>
          <div>
            <p className="text-2xl font-semibold text-slate-900">
              {data.busiestDay ? fmtDate(data.busiestDay.day) : "—"}
            </p>
            <p className="text-xs text-slate-500">{t("dashboard.reportBusiestDay")}</p>
          </div>
        </section>

        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            {t("dashboard.reportBySeverity")}
          </h2>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {SEVERITY_ORDER.map((sev) => (
              <div key={sev} className="rounded-xl border border-soft-border p-3">
                <p className={`text-xl font-semibold ${SEVERITY_TONE[sev]}`}>{severityMap.get(sev) ?? 0}</p>
                <p className="text-xs text-slate-500">{severityLabel(sev, locale)}</p>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            {t("dashboard.reportByType")}
          </h2>
          {data.byType.length === 0 ? (
            <p className="mt-2 text-sm text-slate-500">{t("dashboard.reportEmpty")}</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {data.byType.map((row) => (
                <li key={row.eventType}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-700">{eventTypeLabel(row.eventType, locale)}</span>
                    <span className="font-medium tabular-nums text-slate-900">{row.count}</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-accent" style={{ width: `${(row.count / maxType) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            {t("dashboard.reportByCamera")}
          </h2>
          {data.byCamera.length === 0 ? (
            <p className="mt-2 text-sm text-slate-500">{t("dashboard.reportEmpty")}</p>
          ) : (
            <table className="mt-3 w-full text-left text-sm">
              <tbody>
                {data.byCamera.map((row) => (
                  <tr key={row.code} className="border-b border-soft-border last:border-0">
                    <td className="py-2 text-slate-700">
                      {row.name} <span className="text-slate-400">({row.code})</span>
                    </td>
                    <td className="py-2 text-right font-medium tabular-nums text-slate-900">{row.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <footer className="border-t border-soft-border pt-4 text-xs text-slate-400">
          {t("dashboard.reportFooter")} · luro-ai.com
        </footer>
      </article>
    </div>
  );
}
