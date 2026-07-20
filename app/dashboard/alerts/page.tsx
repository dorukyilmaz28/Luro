import { redirect } from "next/navigation";
import { EventCard } from "@/components/dashboard/EventCard";
import { getTranslator } from "@/lib/i18n/getTranslator";
import { getLocale } from "@/lib/i18n/server";
import { getSession } from "@/lib/auth/session";
import { listRecentEvents } from "@/lib/dashboard/overview";

export default async function AlertsPage() {
  const t = getTranslator(await getLocale());
  const user = await getSession();
  if (!user) redirect("/login");

  const events = await listRecentEvents(user.id, 30);

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs uppercase tracking-[0.18em] text-accent">{t("dashboard.alertsEyebrow")}</p>
        <h1 className="mt-2 text-2xl font-medium tracking-tight text-slate-900">{t("dashboard.alertsTitle")}</h1>
      </div>

      {events.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-soft-border bg-surface-soft p-8 text-center text-sm text-slate-500">
          {t("dashboard.camerasEmpty")}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {events.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      )}
    </div>
  );
}
