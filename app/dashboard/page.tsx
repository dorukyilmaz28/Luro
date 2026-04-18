import { EventCard } from "@/components/dashboard/EventCard";
import { StatCard } from "@/components/dashboard/StatCard";
import { recentEvents, statSummary } from "@/lib/mock/dashboard";

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Total Cameras" value={statSummary.totalCameras} description="Across all connected facilities" />
        <StatCard title="Active Alerts" value={statSummary.activeAlerts} description="Requires immediate review" />
        <StatCard title="Today's Incidents" value={statSummary.todaysIncidents} description="Recorded in last 24 hours" />
        <StatCard title="System Uptime" value={statSummary.uptime} description="Current monitoring availability" />
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-medium text-slate-100">Recent Events</h2>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {recentEvents.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      </section>
    </div>
  );
}
