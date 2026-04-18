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
      <div className="relative h-44 w-full">
        <Image src={event.imageUrl} alt={event.eventType} fill className="object-cover" />
      </div>
      <div className="space-y-2 p-4">
        <p className="text-base font-medium tracking-tight text-slate-100">{event.eventType}</p>
        <p className="text-sm text-slate-300">Kamera: {event.cameraId}</p>
        <p className="text-sm text-slate-400">{formatTime(event.timestamp)}</p>
        <p className="text-sm font-medium text-[#f4d28c]">Güven: %{Math.round(event.confidence * 100)}</p>
      </div>
    </article>
  );
}
