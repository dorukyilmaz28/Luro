"use client";

import { useI18n } from "@/components/i18n/I18nProvider";
import { chartLocaleTag, localizeMockCopy } from "@/lib/i18n/display";
import type { DashboardEvent } from "@/lib/mock/dashboard";
import Image from "next/image";

type EventCardProps = {
  event: DashboardEvent;
};

export function EventCard({ event }: EventCardProps) {
  const { locale, t } = useI18n();

  const formatTime = (timestamp: string) =>
    new Intl.DateTimeFormat(chartLocaleTag(locale), {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(timestamp));

  const label = localizeMockCopy(event.eventType, locale);

  return (
    <article className="overflow-hidden rounded-2xl border border-[#e6d9ca] bg-white/80 shadow-[0_8px_24px_rgba(15,23,42,0.05)]">
      <div className="relative h-36 w-full sm:h-44">
        <Image
          src={event.imageUrl}
          alt={label}
          fill
          className="object-cover"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        />
      </div>
      <div className="space-y-1.5 p-3 sm:space-y-2 sm:p-4">
        <p className="text-sm font-medium tracking-tight text-slate-900 sm:text-base">{label}</p>
        <p className="text-xs text-slate-600 sm:text-sm">
          {t("dashboard.eventCardCamera")}: {event.cameraId}
        </p>
        <p className="text-xs text-slate-500 sm:text-sm">{formatTime(event.timestamp)}</p>
        <p className="text-xs font-medium text-[#8b6d2f] sm:text-sm">
          {t("dashboard.eventCardConfidence")}: %{Math.round(event.confidence * 100)}
        </p>
      </div>
    </article>
  );
}
