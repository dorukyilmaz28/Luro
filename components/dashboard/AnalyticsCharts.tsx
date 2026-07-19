"use client";

import { useI18n } from "@/components/i18n/I18nProvider";
import { localizeChartDayLabel, localizeMockCopy } from "@/lib/i18n/display";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Area, AreaChart, CartesianGrid } from "recharts";
import { useMemo } from "react";
import { eventTypeDistribution, eventsOverTime } from "@/lib/mock/dashboard";

const colors = ["#2f6fb0", "#6fa3d8", "#94a3b8", "#c1554c"];

export function AnalyticsCharts() {
  const { locale, t } = useI18n();

  const eventsData = useMemo(
    () => eventsOverTime.map((row) => ({ ...row, day: localizeChartDayLabel(row.day, locale) })),
    [locale],
  );

  const distributionData = useMemo(
    () => eventTypeDistribution.map((row) => ({ ...row, name: localizeMockCopy(row.name, locale) })),
    [locale],
  );

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
              <YAxis stroke="#475569" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
              <Tooltip
                cursor={{ stroke: "#2f6fb0", strokeDasharray: "3 3" }}
                contentStyle={{ backgroundColor: "#ffffff", border: "1px solid rgba(47,111,176,0.25)", fontSize: 12 }}
              />
              <Area type="monotone" dataKey="events" stroke="#6fa3d8" fillOpacity={1} fill="url(#eventsGradient)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="rounded-2xl border border-soft-border bg-white/80 p-4 sm:p-5">
        <h2 className="text-base font-medium text-slate-900 sm:text-lg">{t("dashboard.chartEventTypes")}</h2>
        <div className="mt-3 h-56 sm:mt-4 sm:h-72">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={distributionData}
                dataKey="value"
                nameKey="name"
                innerRadius={50}
                outerRadius={80}
                label={({ name, percent }: { name?: string; percent?: number }) =>
                  `${name ?? ""} ${((percent ?? 0) * 100).toFixed(0)}%`
                }
                labelLine={false}
              >
                {distributionData.map((item, index) => (
                  <Cell key={item.name} fill={colors[index % colors.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: "#ffffff", border: "1px solid rgba(47,111,176,0.25)", fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
}
