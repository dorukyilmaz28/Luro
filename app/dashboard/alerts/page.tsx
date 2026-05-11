import { EventCard } from "@/components/dashboard/EventCard";
import { getTranslator } from "@/lib/i18n/getTranslator";
import { getLocale } from "@/lib/i18n/server";
import { recentEvents } from "@/lib/mock/dashboard";

export default async function AlertsPage() {
  const t = getTranslator(await getLocale());

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs uppercase tracking-[0.18em] text-[#d4a64a]">{t("dashboard.alertsEyebrow")}</p>
        <h1 className="mt-2 text-2xl font-medium tracking-tight text-slate-900">{t("dashboard.alertsTitle")}</h1>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {recentEvents.map((event) => (
          <EventCard key={event.id} event={event} />
        ))}
      </div>
    </div>
  );
}
