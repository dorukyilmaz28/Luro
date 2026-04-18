import { AnalyticsCharts } from "@/components/dashboard/AnalyticsCharts";

export default function AnalyticsPage() {
  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs uppercase tracking-[0.18em] text-[#d4a64a]">Performance Insights</p>
        <h1 className="mt-2 text-2xl font-medium tracking-tight text-slate-100">Analytics</h1>
      </div>
      <AnalyticsCharts />
    </div>
  );
}
