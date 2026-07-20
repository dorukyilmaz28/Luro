import type { Translator } from "@/lib/i18n/getTranslator";
import type { Locale } from "@/lib/i18n/locale";
import { aggregateHeatmapMatrix, eventTypeLabel, type HeatmapRow } from "@/lib/dashboard/labels";

type HeatmapGridProps = {
  rows: HeatmapRow[];
  locale: Locale;
  t: Translator;
};

function intensity(value: number, max: number): string {
  if (max <= 0 || value <= 0) return "bg-white text-slate-400";
  const ratio = Math.min(1, value / max);
  if (ratio < 0.15) return "bg-amber-50 text-amber-900";
  if (ratio < 0.35) return "bg-amber-100 text-amber-900";
  if (ratio < 0.6) return "bg-amber-200 text-amber-900";
  if (ratio < 0.85) return "bg-orange-300 text-orange-950";
  return "bg-rose-400 text-white";
}

export function HeatmapGrid({ rows, locale, t }: HeatmapGridProps) {
  const { cameras, eventTypes, counts, max } = aggregateHeatmapMatrix(rows);

  return (
    <section className="rounded-2xl border border-soft-border bg-white/80 p-4 sm:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500 sm:text-xs">{t("risk.heatmapEyebrow")}</p>
          <h2 className="mt-1 text-base font-medium text-slate-900 sm:text-lg">{t("risk.heatmapTitle")}</h2>
        </div>
        {max > 0 ? (
          <p className="text-xs text-slate-500">
            {t("risk.heatmapDensest")}: <span className="font-medium text-slate-700">{max}</span>
          </p>
        ) : null}
      </div>

      {cameras.length === 0 || eventTypes.length === 0 ? (
        <p className="mt-4 rounded-xl border border-dashed border-soft-border bg-white/60 px-3 py-6 text-center text-sm text-slate-500">
          {t("risk.heatmapEmpty")}
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full border-separate border-spacing-1 text-xs">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 bg-white/80 px-2 py-1 text-left text-[11px] font-medium text-slate-500">
                  {t("risk.heatmapThCamera")}
                </th>
                {eventTypes.map((et) => (
                  <th key={et} className="px-2 py-1 text-center text-[11px] font-medium text-slate-500">
                    {eventTypeLabel(et, locale)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cameras.map((cam, ri) => (
                <tr key={cam}>
                  <th
                    scope="row"
                    className="sticky left-0 z-10 whitespace-nowrap bg-white/80 px-2 py-1.5 text-left text-xs font-medium text-slate-700"
                  >
                    {cam}
                  </th>
                  {eventTypes.map((et, ci) => {
                    const value = counts[ri][ci];
                    return (
                      <td
                        key={`${cam}:${et}`}
                        className={`min-w-[3.5rem] rounded-md border border-soft-border px-2 py-1.5 text-center text-xs font-medium tabular-nums ${intensity(
                          value,
                          max,
                        )}`}
                        title={`${cam}${t("risk.titleAttrSep")}${eventTypeLabel(et, locale)}: ${value}`}
                      >
                        {value > 0 ? value : ""}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
