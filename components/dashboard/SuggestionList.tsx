import { dismissSuggestionAction, recomputeSuggestionsAction } from "@/app/dashboard/risk/actions";
import { eventTypeLabel, severityLabel, type Severity, type SuggestionRow } from "@/lib/dashboard/risk";

type SuggestionListProps = {
  suggestions: SuggestionRow[];
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

function evidenceSummary(evidence: Record<string, unknown>): string | null {
  const window = typeof evidence.window === "string" ? evidence.window : null;
  const eventCount = typeof evidence.event_count === "number" ? evidence.event_count : null;
  const eventType = typeof evidence.event_type === "string" ? evidence.event_type : null;

  const parts: string[] = [];
  if (eventType) parts.push(eventTypeLabel(eventType));
  if (eventCount !== null) parts.push(`${eventCount} olay`);
  if (window) parts.push(`pencere: ${window}`);
  return parts.length ? parts.join(" Â· ") : null;
}

export function SuggestionList({ suggestions }: SuggestionListProps) {
  return (
    <section className="rounded-2xl border border-[#e6d9ca] bg-white/80 p-4 sm:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500 sm:text-xs">
            Proaktif Ã–neriler
          </p>
          <h2 className="mt-1 text-base font-medium text-slate-900 sm:text-lg">
            Aksiyon listesi
          </h2>
        </div>
        <form action={recomputeSuggestionsAction}>
          <button
            type="submit"
            className="rounded-lg border border-[#d4a64a]/45 bg-[#d4a64a]/10 px-3 py-1.5 text-xs font-medium text-[#8b6d2f] transition hover:bg-[#d4a64a]/20"
          >
            Ã–nerileri yeniden hesapla
          </button>
        </form>
      </div>

      <div className="mt-4 space-y-2.5">
        {suggestions.length === 0 ? (
          <p className="rounded-xl border border-dashed border-[#e6d9ca] bg-white/60 px-3 py-5 text-sm text-slate-500">
            Bekleyen Ã¶neri yok. &laquo;Ã–nerileri yeniden hesapla&raquo;
            butonu ile mevcut olaylara gÃ¶re liste gÃ¼ncellenir.
          </p>
        ) : (
          suggestions.map((s) => {
            const summary = evidenceSummary(s.evidence ?? {});
            return (
              <article
                key={s.id}
                className="rounded-xl border border-[#e6d9ca] bg-white/70 p-3 sm:p-4"
              >
                <header className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-semibold text-slate-900">{s.title}</h3>
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${tone(
                          s.severity,
                        )}`}
                      >
                        {severityLabel(s.severity)}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {s.camera_id ? <>Kamera: <span className="text-slate-700">{s.camera_id}</span></> : "TÃ¼m tesis"}
                      {summary ? <> Â· {summary}</> : null}
                    </p>
                  </div>
                  <form action={dismissSuggestionAction}>
                    <input type="hidden" name="id" value={s.id} />
                    <button
                      type="submit"
                      className="rounded-md border border-[#d6c6b2] bg-white/70 px-2.5 py-1 text-[11px] font-medium text-slate-600 transition hover:border-[#c3af97] hover:text-slate-900"
                    >
                      Kapat
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
