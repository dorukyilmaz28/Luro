"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Area, AreaChart, CartesianGrid } from "recharts";
import { eventTypeDistribution, eventsOverTime } from "@/lib/mock/dashboard";

const colors = ["#d4a64a", "#f0c872", "#9bb0d0", "#7f92b2"];

export function AnalyticsCharts() {
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <h2 className="text-lg font-medium text-slate-100">Zamana Göre Olaylar</h2>
        <div className="mt-4 h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={eventsOverTime}>
              <defs>
                <linearGradient id="eventsGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#d4a64a" stopOpacity={0.6} />
                  <stop offset="95%" stopColor="#d4a64a" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
              <XAxis dataKey="day" stroke="#94a3b8" tickLine={false} axisLine={false} />
              <YAxis stroke="#94a3b8" tickLine={false} axisLine={false} />
              <Tooltip
                cursor={{ stroke: "#d4a64a", strokeDasharray: "3 3" }}
                contentStyle={{ backgroundColor: "#0b1f3a", border: "1px solid rgba(255,255,255,0.15)" }}
              />
              <Area type="monotone" dataKey="events" stroke="#f4d28c" fillOpacity={1} fill="url(#eventsGradient)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <h2 className="text-lg font-medium text-slate-100">Olay Türü Dağılımı</h2>
        <div className="mt-4 h-72">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={eventTypeDistribution} dataKey="value" nameKey="name" innerRadius={65} outerRadius={100} label>
                {eventTypeDistribution.map((item, index) => (
                  <Cell key={item.name} fill={colors[index % colors.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: "#0b1f3a", border: "1px solid rgba(255,255,255,0.15)" }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
}
