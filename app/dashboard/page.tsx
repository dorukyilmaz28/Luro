import { EventCard } from "@/components/dashboard/EventCard";
import { StatCard } from "@/components/dashboard/StatCard";
import { recentEvents, statSummary } from "@/lib/mock/dashboard";

export default function DashboardPage() {
  return (
    <div className="space-y-6 sm:space-y-8">
      <section className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard title="Toplam Kamera" value={statSummary.totalCameras} description="Bağlı tüm tesisler genelinde" />
        <StatCard title="Aktif Uyarılar" value={statSummary.activeAlerts} description="Acil inceleme gerektiriyor" />
        <StatCard title="Bugünkü Olaylar" value={statSummary.todaysIncidents} description="Son 24 saat içinde kayıtlı" />
        <StatCard title="Çalışma Süresi" value={statSummary.uptime} description="Anlık izleme durumu" />
      </section>

      <section className="space-y-3 sm:space-y-4">
        <h2 className="text-lg font-medium text-slate-100 sm:text-xl">Son Olaylar</h2>
        <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3">
          {recentEvents.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      </section>
    </div>
  );
}
