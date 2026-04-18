import Image from "next/image";
import type { DashboardEvent } from "@/lib/mock/dashboard";

type EventCardProps = {
  event: DashboardEvent;
};

function formatTime(timestamp: string) {
  const value = new Date(timestamp);
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

export function EventCard({ event }: EventCardProps) {
  return (
    <article className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
      <div className="relative h-36 w-full sm:h-44">
        <Image src={event.imageUrl} alt={event.eventType} fill className="object-cover" sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" />
      </div>
      <div className="space-y-1.5 p-3 sm:space-y-2 sm:p-4">
        <p className="text-sm font-medium tracking-tight text-slate-100 sm:text-base">{event.eventType}</p>
        <p className="text-xs text-slate-300 sm:text-sm">Kamera: {event.cameraId}</p>
        <p className="text-xs text-slate-400 sm:text-sm">{formatTime(event.timestamp)}</p>
        <p className="text-xs font-medium text-[#f4d28c] sm:text-sm">Güven: %{Math.round(event.confidence * 100)}</p>
      </div>
    </article>
  );
}
