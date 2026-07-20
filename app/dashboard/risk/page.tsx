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
import { getTranslator } from "@/lib/i18n/getTranslator";
import { getLocale } from "@/lib/i18n/server";
import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";

type RiskPageProps = {
  searchParams: Promise<{ window?: string }>;
};

export default async function RiskPage({ searchParams }: RiskPageProps) {
  const locale = await getLocale();
  const t = getTranslator(locale);
  const user = await getSession();
  if (!user) redirect("/login");

  const WINDOW_OPTIONS: { key: RiskWindowKey; labelKey: string }[] = [
    { key: "hour", labelKey: "risk.windowHour" },
    { key: "day", labelKey: "risk.windowDay" },
    { key: "week", labelKey: "risk.windowWeek" },
  ];

  const params = await searchParams;
  const requested = (params.window ?? "day") as RiskWindowKey;
  const windowKey: RiskWindowKey = requested in RISK_WINDOWS ? requested : "day";
  const windowMinutes = RISK_WINDOWS[windowKey];
  const windowOption = WINDOW_OPTIONS.find((opt) => opt.key === windowKey) ?? WINDOW_OPTIONS[1];
  const windowLabel = t(windowOption.labelKey);

  let global = { total_score: 0, camera_count: 0, event_count: 0 };
  let cameras: Awaited<ReturnType<typeof listCameraRiskScores>> = [];
  let heatmap: Awaited<ReturnType<typeof getEventHeatmap>> = [];
  let suggestions: Awaited<ReturnType<typeof listSuggestions>> = [];
  let loadError: string | null = null;

  try {
    [global, cameras, heatmap, suggestions] = await Promise.all([
      getGlobalRiskScore(user.id, windowMinutes),
      listCameraRiskScores(user.id, windowMinutes),
      getEventHeatmap(user.id),
      listSuggestions(user.id),
    ]);
  } catch (err) {
    loadError = err instanceof Error ? err.message : t("risk.loadFailed");
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-accent">{t("risk.eyebrow")}</p>
          <h1 className="font-display mt-2 text-2xl text-foreground">{t("risk.title")}</h1>
          <p className="mt-1 text-sm text-slate-600">{t("risk.subtitle")}</p>
        </div>
        <nav className="flex gap-1.5 rounded-xl border border-soft-border bg-white p-1">
          {WINDOW_OPTIONS.map((opt) => {
            const isActive = opt.key === windowKey;
            return (
              <Link
                key={opt.key}
                href={`/dashboard/risk?window=${opt.key}`}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  isActive
                    ? "bg-accent/15 text-accent"
                    : "text-slate-600 hover:bg-surface-soft hover:text-foreground"
                }`}
              >
                {t(opt.labelKey)}
              </Link>
            );
          })}
        </nav>
      </div>

      {loadError ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-800">
          {t("risk.loadErrorPrefix")} {loadError}. {t("risk.loadErrorHint")}
        </div>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-2">
        <RiskScoreCard global={global} cameras={cameras} windowLabel={windowLabel} locale={locale} t={t} />
        <SuggestionList suggestions={suggestions} locale={locale} t={t} />
      </div>

      <HeatmapGrid rows={heatmap} locale={locale} t={t} />
    </div>
  );
}
