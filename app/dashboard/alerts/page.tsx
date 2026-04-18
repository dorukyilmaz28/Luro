import { EventCard } from "@/components/dashboard/EventCard";
import { recentEvents } from "@/lib/mock/dashboard";

export default function AlertsPage() {
  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs uppercase tracking-[0.18em] text-[#d4a64a]">Canlı Güvenlik Akışı</p>
        <h1 className="mt-2 text-2xl font-medium tracking-tight text-slate-100">Uyarılar</h1>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {recentEvents.map((event) => (
          <EventCard key={event.id} event={event} />
        ))}
      </div>
    </div>
  );
}
