"use client";

import { useI18n } from "@/components/i18n/I18nProvider";
import { chartLocaleTag } from "@/lib/i18n/display";
import { eventTypeLabel, severityLabel, type Severity } from "@/lib/dashboard/labels";
import type { RecentEvent } from "@/lib/dashboard/overview";
import Image from "next/image";

type EventCardProps = {
  event: RecentEvent;
};

const SEVERITY_DOT: Record<string, string> = {
  critical: "bg-danger",
  high: "bg-danger",
  medium: "bg-amber-500",
  low: "bg-emerald-500",
};

export function EventCard({ event }: EventCardProps) {
  const { locale, t } = useI18n();

  const formatTime = (timestamp: string) =>
    new Intl.DateTimeFormat(chartLocaleTag(locale), {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(timestamp));

  const label = eventTypeLabel(event.eventType, locale);
  const cameraLabel = event.cameraCode || event.cameraName || "-";

  return (
    <article className="overflow-hidden rounded-2xl border border-soft-border bg-white/80 shadow-[0_8px_24px_rgba(15,23,42,0.05)]">
      {event.imageUrl ? (
        <div className="relative h-36 w-full sm:h-44">
          <Image
            src={event.imageUrl}
            alt={label}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        </div>
      ) : (
        <div className="flex h-24 w-full items-center justify-center bg-slate-50">
          <span className={`h-2.5 w-2.5 rounded-full ${SEVERITY_DOT[event.severity] ?? "bg-slate-300"}`} />
        </div>
      )}
      <div className="space-y-1.5 p-3 sm:space-y-2 sm:p-4">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium tracking-tight text-slate-900 sm:text-base">{label}</p>
          <span className="shrink-0 text-[11px] font-medium text-slate-500">
            {severityLabel(event.severity as Severity, locale)}
          </span>
        </div>
        <p className="text-xs text-slate-600 sm:text-sm">
          {t("dashboard.eventCardCamera")}: {cameraLabel}
        </p>
        <p className="text-xs text-slate-500 sm:text-sm">{formatTime(event.createdAt)}</p>
        {event.confidence != null ? (
          <p className="text-xs font-medium text-accent sm:text-sm">
            {t("dashboard.eventCardConfidence")}: %{Math.round(event.confidence * 100)}
          </p>
        ) : null}
      </div>
    </article>
  );
}
