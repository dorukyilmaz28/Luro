import { redirect } from "next/navigation";
import { EventCard } from "@/components/dashboard/EventCard";
import { StatCard } from "@/components/dashboard/StatCard";
import { AutoRefresh } from "@/components/dashboard/AutoRefresh";
import { getTranslator } from "@/lib/i18n/getTranslator";
import { getLocale } from "@/lib/i18n/server";
import { getSession } from "@/lib/auth/session";
import { getDashboardStats, listRecentEvents } from "@/lib/dashboard/overview";

export default async function DashboardPage() {
  const t = getTranslator(await getLocale());
  const user = await getSession();
  if (!user) redirect("/login");

  const [stats, recentEvents] = await Promise.all([getDashboardStats(user.id), listRecentEvents(user.id, 6)]);

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="flex justify-end">
        <AutoRefresh />
      </div>
      <section className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard
          title={t("dashboard.statsTotalCameras")}
          value={stats.totalCameras}
          description={t("dashboard.statsTotalCamerasDesc")}
        />
        <StatCard
          title={t("dashboard.statsActiveAlerts")}
          value={stats.activeAlerts}
          description={t("dashboard.statsActiveAlertsDesc")}
        />
        <StatCard
          title={t("dashboard.statsToday")}
          value={stats.todaysIncidents}
          description={t("dashboard.statsTodayDesc")}
        />
        <StatCard
          title={t("dashboard.statsUptime")}
          value={`${stats.uptimePercent}%`}
          description={t("dashboard.statsUptimeDesc")}
        />
      </section>

      <section className="space-y-3 sm:space-y-4">
        <h2 className="text-lg font-medium text-slate-900 sm:text-xl">{t("dashboard.recentEvents")}</h2>
        {recentEvents.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-soft-border bg-surface-soft p-8 text-center text-sm text-slate-500">
            {t("dashboard.camerasEmpty")}
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3">
            {recentEvents.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
