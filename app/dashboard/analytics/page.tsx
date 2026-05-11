import { AnalyticsCharts } from "@/components/dashboard/AnalyticsCharts";
import { getTranslator } from "@/lib/i18n/getTranslator";
import { getLocale } from "@/lib/i18n/server";

export default async function AnalyticsPage() {
  const locale = await getLocale();
  const t = getTranslator(locale);

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs uppercase tracking-[0.18em] text-[#d4a64a]">{t("dashboard.analyticsEyebrow")}</p>
        <h1 className="mt-2 text-2xl font-medium tracking-tight text-slate-900">{t("dashboard.analyticsTitle")}</h1>
      </div>
      <AnalyticsCharts />
    </div>
  );
}
