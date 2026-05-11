import {
  eventTypeLabel,
  severityLabel,
  type CameraRiskScore,
  type GlobalRiskScore,
  type Severity,
} from "@/lib/dashboard/risk";

type RiskScoreCardProps = {
  global: GlobalRiskScore;
  cameras: CameraRiskScore[];
  windowLabel: string;
};

const SEVERITY_TONE: Record<Severity, string> = {
  critical: "bg-rose-100 text-rose-800 border-rose-200",
  high: "bg-amber-100 text-amber-800 border-amber-200",
  medium: "bg-yellow-50 text-yellow-800 border-yellow-200",
  low: "bg-emerald-50 text-emerald-800 border-emerald-200",
};

function severityTone(severity: Severity | null): string {
  return severity ? SEVERITY_TONE[severity] : "bg-slate-50 text-slate-600 border-slate-200";
}

function scoreLevel(score: number): { label: string; tone: string } {
  if (score >= 30) return { label: "YÃ¼ksek", tone: "text-rose-700" };
  if (score >= 10) return { label: "Orta", tone: "text-amber-700" };
  if (score > 0) return { label: "DÃ¼ÅŸÃ¼k", tone: "text-emerald-700" };
  return { label: "Sakin", tone: "text-slate-500" };
}

export function RiskScoreCard({ global, cameras, windowLabel }: RiskScoreCardProps) {
  const top = cameras.slice(0, 3);
  const level = scoreLevel(global.total_score);

  return (
    <section className="rounded-2xl border border-[#e6d9ca] bg-white/80 p-4 sm:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500 sm:text-xs">
            Risk Skoru
          </p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            {global.total_score.toFixed(1)}
            <span className={`ml-2 text-sm font-medium ${level.tone}`}>{level.label}</span>
          </h2>
        </div>
        <p className="text-xs text-slate-500">
          Pencere: <span className="font-medium text-slate-700">{windowLabel}</span> Â· {global.event_count} olay,{" "}
          {global.camera_count} kamera
        </p>
      </div>

      <div className="mt-4 space-y-2 sm:mt-5">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">
          En riskli kameralar
        </p>
        {top.length === 0 ? (
          <p className="rounded-xl border border-dashed border-[#e6d9ca] bg-white/60 px-3 py-4 text-sm text-slate-500">
            Bu pencerede kayÄ±tlÄ± olay yok. Kameralar sakin gÃ¶rÃ¼nÃ¼yor.
          </p>
        ) : (
          <ul className="space-y-2">
            {top.map((row) => (
              <li
                key={row.camera_id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#e6d9ca] bg-white/70 px-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-900">{row.camera_id}</p>
                  <p className="truncate text-xs text-slate-500">
                    BaskÄ±n olay:{" "}
                    <span className="text-slate-700">
                      {row.top_event_type ? eventTypeLabel(row.top_event_type) : "â€”"}
                    </span>{" "}
                    Â· {row.event_count} olay
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${severityTone(
                      row.top_severity,
                    )}`}
                  >
                    {severityLabel(row.top_severity)}
                  </span>
                  <span className="text-sm font-semibold tabular-nums text-slate-900">
                    {row.score.toFixed(1)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
