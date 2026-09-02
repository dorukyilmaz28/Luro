"use client";

import { useI18n } from "@/components/i18n/I18nProvider";
import { chartLocaleTag } from "@/lib/i18n/display";
import { eventTypeLabel } from "@/lib/dashboard/labels";
import type { DailyEventCount, EventTypeCount } from "@/lib/dashboard/overview";
import { ResponsiveContainer, Tooltip, XAxis, YAxis, Area, AreaChart, CartesianGrid } from "recharts";
import { useMemo } from "react";

type AnalyticsChartsProps = {
  distribution: EventTypeCount[];
  overTime: DailyEventCount[];
};

export function AnalyticsCharts({ distribution, overTime }: AnalyticsChartsProps) {
  const { locale, t } = useI18n();

  const eventsData = useMemo(() => {
    const formatter = new Intl.DateTimeFormat(chartLocaleTag(locale), { day: "numeric", month: "short" });
    return overTime.map((row) => ({
      day: formatter.format(new Date(`${row.day}T12:00:00Z`)),
      events: row.count,
    }));
  }, [overTime, locale]);

  const maxCount = Math.max(...distribution.map((row) => row.count), 1);

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <section className="rounded-2xl border border-soft-border bg-white/80 p-4 sm:p-5">
        <h2 className="text-base font-medium text-slate-900 sm:text-lg">{t("dashboard.chartEventsOverTime")}</h2>
        <div className="mt-3 h-56 sm:mt-4 sm:h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={eventsData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="eventsGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2f6fb0" stopOpacity={0.6} />
                  <stop offset="95%" stopColor="#2f6fb0" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(15,23,42,0.10)" vertical={false} />
              <XAxis dataKey="day" stroke="#475569" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
              <YAxis stroke="#475569" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip
                cursor={{ stroke: "#2f6fb0", strokeDasharray: "3 3" }}
                contentStyle={{ backgroundColor: "#ffffff", border: "1px solid rgba(47,111,176,0.25)", fontSize: 12 }}
              />
              <Area
                type="monotone"
                dataKey="events"
                stroke="#6fa3d8"
                fillOpacity={1}
                fill="url(#eventsGradient)"
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="rounded-2xl border border-soft-border bg-white/80 p-4 sm:p-5">
        <h2 className="text-base font-medium text-slate-900 sm:text-lg">{t("dashboard.chartEventTypes")}</h2>
        {distribution.length === 0 ? (
          <div className="mt-3 flex h-56 items-center justify-center text-sm text-slate-500 sm:mt-4 sm:h-72">
            {t("dashboard.camerasEmpty")}
          </div>
        ) : (
          <ul className="mt-4 space-y-3 sm:mt-5">
            {distribution.map((row) => (
              <li key={row.eventType}>
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-slate-700">{eventTypeLabel(row.eventType, locale)}</span>
                  <span className="font-medium tabular-nums text-slate-900">{row.count}</span>
                </div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-accent"
                    style={{ width: `${Math.max((row.count / maxCount) * 100, 3)}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
