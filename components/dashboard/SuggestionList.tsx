import { dismissSuggestionAction, recomputeSuggestionsAction } from "@/app/dashboard/risk/actions";
import type { Translator } from "@/lib/i18n/getTranslator";
import type { Locale } from "@/lib/i18n/locale";
import { eventTypeLabel, severityLabel, type Severity, type SuggestionRow } from "@/lib/dashboard/risk";

type SuggestionListProps = {
  suggestions: SuggestionRow[];
  locale: Locale;
  t: Translator;
};

const SEVERITY_TONE: Record<Severity, string> = {
  critical: "bg-rose-100 text-rose-800 border-rose-200",
  high: "bg-amber-100 text-amber-800 border-amber-200",
  medium: "bg-yellow-50 text-yellow-800 border-yellow-200",
  low: "bg-emerald-50 text-emerald-800 border-emerald-200",
};

function tone(severity: Severity): string {
  return SEVERITY_TONE[severity] ?? "bg-slate-50 text-slate-600 border-slate-200";
}

function evidenceSummary(evidence: Record<string, unknown>, locale: Locale, t: Translator): string | null {
  const window = typeof evidence.window === "string" ? evidence.window : null;
  const eventCount = typeof evidence.event_count === "number" ? evidence.event_count : null;
  const eventType = typeof evidence.event_type === "string" ? evidence.event_type : null;

  const parts: string[] = [];
  if (eventType) parts.push(eventTypeLabel(eventType, locale));
  if (eventCount !== null) parts.push(`${eventCount} ${t("risk.eventsCount")}`);
  if (window) parts.push(`${t("risk.windowEvidence")}: ${window}`);
  return parts.length ? parts.join(t("risk.titleAttrSep")) : null;
}

export function SuggestionList({ suggestions, locale, t }: SuggestionListProps) {
  return (
    <section className="rounded-2xl border border-soft-border bg-white/80 p-4 sm:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500 sm:text-xs">{t("risk.suggestionsEyebrow")}</p>
          <h2 className="mt-1 text-base font-medium text-slate-900 sm:text-lg">{t("risk.suggestionsTitle")}</h2>
        </div>
        <form action={recomputeSuggestionsAction}>
          <button
            type="submit"
            className="rounded-lg border border-accent/45 bg-accent/10 px-3 py-1.5 text-xs font-medium text-accent transition hover:bg-accent/20"
          >
            {t("risk.recompute")}
          </button>
        </form>
      </div>

      <div className="mt-4 space-y-2.5">
        {suggestions.length === 0 ? (
          <p className="rounded-xl border border-dashed border-soft-border bg-white/60 px-3 py-5 text-sm text-slate-500">
            {t("risk.suggestionsEmpty")}
          </p>
        ) : (
          suggestions.map((s) => {
            const summary = evidenceSummary(s.evidence ?? {}, locale, t);
            return (
              <article key={s.id} className="rounded-xl border border-soft-border bg-white/70 p-3 sm:p-4">
                <header className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-semibold text-slate-900">{s.title}</h3>
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${tone(
                          s.severity,
                        )}`}
                      >
                        {severityLabel(s.severity, locale)}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {s.camera_id ? (
                        <>
                          {t("risk.cameraPrefix")}: <span className="text-slate-700">{s.camera_id}</span>
                        </>
                      ) : (
                        t("risk.allSite")
                      )}
                      {summary ? (
                        <>
                          {t("risk.titleAttrSep")}
                          {summary}
                        </>
                      ) : null}
                    </p>
                  </div>
                  <form action={dismissSuggestionAction}>
                    <input type="hidden" name="id" value={s.id} />
                    <button
                      type="submit"
                      className="rounded-md border border-soft-border bg-white/70 px-2.5 py-1 text-[11px] font-medium text-slate-600 transition hover:border-accent hover:text-slate-900"
                    >
                      {t("risk.dismiss")}
                    </button>
                  </form>
                </header>
                <p className="mt-2 text-sm leading-relaxed text-slate-700">{s.body}</p>
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}
