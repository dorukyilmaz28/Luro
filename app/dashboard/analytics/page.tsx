import { redirect } from "next/navigation";
import { AnalyticsCharts } from "@/components/dashboard/AnalyticsCharts";
import { getTranslator } from "@/lib/i18n/getTranslator";
import { getLocale } from "@/lib/i18n/server";
import { getSession } from "@/lib/auth/session";
import { getEventTypeDistribution, getEventsOverTime } from "@/lib/dashboard/overview";

export default async function AnalyticsPage() {
  const locale = await getLocale();
  const t = getTranslator(locale);
  const user = await getSession();
  if (!user) redirect("/login");

  const [distribution, overTime] = await Promise.all([
    getEventTypeDistribution(user.id, 7),
    getEventsOverTime(user.id, 7),
  ]);

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs uppercase tracking-[0.18em] text-accent">{t("dashboard.analyticsEyebrow")}</p>
        <h1 className="mt-2 text-2xl font-medium tracking-tight text-slate-900">{t("dashboard.analyticsTitle")}</h1>
      </div>
      <AnalyticsCharts distribution={distribution} overTime={overTime} />
    </div>
  );
}
