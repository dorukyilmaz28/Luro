import Link from "next/link";
import { HeatmapGrid } from "@/components/dashboard/HeatmapGrid";
import { RiskScoreCard } from "@/components/dashboard/RiskScoreCard";
import { SuggestionList } from "@/components/dashboard/SuggestionList";
import {
  getEventHeatmap,
  getGlobalRiskScore,
  listCameraRiskScores,
  listSuggestions,
  RISK_WINDOWS,
  type RiskWindowKey,
} from "@/lib/dashboard/risk";
import { createClient } from "@/lib/supabase/server";

const WINDOW_OPTIONS: { key: RiskWindowKey; label: string }[] = [
  { key: "hour", label: "Son 1 saat" },
  { key: "day", label: "Son 24 saat" },
  { key: "week", label: "Son 7 gÃ¼n" },
];

type RiskPageProps = {
  searchParams: Promise<{ window?: string }>;
};

export default async function RiskPage({ searchParams }: RiskPageProps) {
  const params = await searchParams;
  const requested = (params.window ?? "day") as RiskWindowKey;
  const windowKey: RiskWindowKey = requested in RISK_WINDOWS ? requested : "day";
  const windowMinutes = RISK_WINDOWS[windowKey];
  const windowLabel = WINDOW_OPTIONS.find((opt) => opt.key === windowKey)?.label ?? "Son 24 saat";

  const supabase = await createClient();

  let global = { total_score: 0, camera_count: 0, event_count: 0 };
  let cameras: Awaited<ReturnType<typeof listCameraRiskScores>> = [];
  let heatmap: Awaited<ReturnType<typeof getEventHeatmap>> = [];
  let suggestions: Awaited<ReturnType<typeof listSuggestions>> = [];
  let loadError: string | null = null;

  try {
    [global, cameras, heatmap, suggestions] = await Promise.all([
      getGlobalRiskScore(supabase, windowMinutes),
      listCameraRiskScores(supabase, windowMinutes),
      getEventHeatmap(supabase),
      listSuggestions(supabase),
    ]);
  } catch (err) {
    loadError = err instanceof Error ? err.message : "Veriler yÃ¼klenemedi.";
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-[#d4a64a]">Saha Riski</p>
          <h1 className="mt-2 text-2xl font-medium tracking-tight text-slate-900">Risk &amp; Ã–neri</h1>
          <p className="mt-1 text-sm text-slate-600">
            CanlÄ± risk skoru, kamera Ã— olay tÃ¼rÃ¼ Ä±sÄ± haritasÄ± ve eÅŸik tabanlÄ± proaktif Ã¶neriler.
          </p>
        </div>
        <nav className="flex gap-1.5 rounded-xl border border-[#e6d9ca] bg-white/70 p-1">
          {WINDOW_OPTIONS.map((opt) => {
            const isActive = opt.key === windowKey;
            return (
              <Link
                key={opt.key}
                href={`/dashboard/risk?window=${opt.key}`}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  isActive
                    ? "bg-[#d4a64a]/15 text-[#8b6d2f]"
                    : "text-slate-600 hover:bg-white hover:text-slate-900"
                }`}
              >
                {opt.label}
              </Link>
            );
          })}
        </nav>
      </div>

      {loadError ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-800">
          Risk verileri okunamadÄ±: {loadError}. Supabase migration&apos;Ä±nÄ±n uygulandÄ±ÄŸÄ±ndan ve oturumun aÃ§Ä±k olduÄŸundan emin olun.
        </div>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-2">
        <RiskScoreCard global={global} cameras={cameras} windowLabel={windowLabel} />
        <SuggestionList suggestions={suggestions} />
      </div>

      <HeatmapGrid rows={heatmap} />
    </div>
  );
}
