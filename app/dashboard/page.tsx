import { EventCard } from "@/components/dashboard/EventCard";
import { StatCard } from "@/components/dashboard/StatCard";
import { getTranslator } from "@/lib/i18n/getTranslator";
import { getLocale } from "@/lib/i18n/server";
import { recentEvents, statSummary } from "@/lib/mock/dashboard";

export default async function DashboardPage() {
  const t = getTranslator(await getLocale());

  return (
    <div className="space-y-6 sm:space-y-8">
      <section className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard
          title={t("dashboard.statsTotalCameras")}
          value={statSummary.totalCameras}
          description={t("dashboard.statsTotalCamerasDesc")}
        />
        <StatCard
          title={t("dashboard.statsActiveAlerts")}
          value={statSummary.activeAlerts}
          description={t("dashboard.statsActiveAlertsDesc")}
        />
        <StatCard
          title={t("dashboard.statsToday")}
          value={statSummary.todaysIncidents}
          description={t("dashboard.statsTodayDesc")}
        />
        <StatCard
          title={t("dashboard.statsUptime")}
          value={statSummary.uptime}
          description={t("dashboard.statsUptimeDesc")}
        />
      </section>

      <section className="space-y-3 sm:space-y-4">
        <h2 className="text-lg font-medium text-slate-900 sm:text-xl">{t("dashboard.recentEvents")}</h2>
        <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3">
          {recentEvents.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      </section>
    </div>
  );
}
