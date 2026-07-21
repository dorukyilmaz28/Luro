"use client";

import { useI18n } from "@/components/i18n/I18nProvider";
import { chartLocaleTag } from "@/lib/i18n/display";
import { eventTypeLabel } from "@/lib/dashboard/labels";
import type { ReviewItem, ReviewStatus } from "@/lib/dashboard/overview";
import { useMemo, useState } from "react";

function downloadText(filename: string, content: string, mime = "text/plain") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

type Props = {
  initialItems: ReviewItem[];
};

export function AiTrainingReview({ initialItems }: Props) {
  const { locale, t } = useI18n();
  const [items, setItems] = useState<ReviewItem[]>(initialItems);

  const formatTime = (timestamp: string) =>
    new Intl.DateTimeFormat(chartLocaleTag(locale), { dateStyle: "medium", timeStyle: "short" }).format(
      new Date(timestamp),
    );

  const stats = useMemo(() => {
    const pending = items.filter((s) => s.reviewStatus === "pending").length;
    const confirmed = items.filter((s) => s.reviewStatus === "confirmed_violation").length;
    const dismissed = items.filter((s) => s.reviewStatus === "dismissed").length;
    return { pending, confirmed, dismissed };
  }, [items]);

  function statusBadge(status: ReviewStatus) {
    if (status === "confirmed_violation") return t("dashboard.statusConfirmed");
    if (status === "dismissed") return t("dashboard.statusDismissed");
    return t("dashboard.statusPending");
  }

  async function persist(id: string, patch: { reviewStatus?: ReviewStatus; reviewNote?: string }) {
    await fetch(`/api/events/${id}/review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
  }

  function updateStatus(id: string, reviewStatus: ReviewStatus) {
    setItems((prev) => prev.map((s) => (s.id === id ? { ...s, reviewStatus } : s)));
    void persist(id, { reviewStatus });
  }

  function updateNote(id: string, reviewNote: string) {
    setItems((prev) => prev.map((s) => (s.id === id ? { ...s, reviewNote } : s)));
  }

  function exportJson() {
    downloadText(
      "ai-training-feedback.json",
      JSON.stringify({ exportedAt: new Date().toISOString(), items }, null, 2),
      "application/json",
    );
  }

  function exportCsv() {
    const header = ["id", "eventType", "cameraCode", "timestamp", "confidence", "reviewStatus", "reviewNote"];
    const lines = items.map((s) =>
      [s.id, s.eventType, s.cameraCode ?? "", s.createdAt, String(s.confidence ?? ""), s.reviewStatus, s.reviewNote ?? ""]
        .map((field) => `"${String(field).replaceAll('"', '""')}"`)
        .join(","),
    );
    downloadText("ai-training-feedback.csv", [header.join(","), ...lines].join("\n"), "text/csv");
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-accent">{t("dashboard.aiEyebrow")}</p>
          <h1 className="mt-2 text-2xl font-medium tracking-tight text-slate-900">{t("dashboard.aiTitle")}</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">{t("dashboard.aiBody")}</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={exportJson}
            className="rounded-lg border border-soft-border bg-white/70 px-3 py-2 text-sm text-slate-700 hover:bg-white"
          >
            {t("dashboard.exportJson")}
          </button>
          <button
            type="button"
            onClick={exportCsv}
            className="rounded-lg border border-soft-border bg-white/70 px-3 py-2 text-sm text-slate-700 hover:bg-white"
          >
            {t("dashboard.exportCsv")}
          </button>
        </div>
      </div>

      <section className="grid gap-3 sm:grid-cols-3">
        <article className="rounded-xl border border-soft-border bg-white/70 p-4">
          <p className="text-xs uppercase tracking-[0.12em] text-slate-500">{t("dashboard.statPending")}</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{stats.pending}</p>
        </article>
        <article className="rounded-xl border border-soft-border bg-white/70 p-4">
          <p className="text-xs uppercase tracking-[0.12em] text-slate-500">{t("dashboard.statConfirmed")}</p>
          <p className="mt-2 text-2xl font-semibold text-emerald-700">{stats.confirmed}</p>
        </article>
        <article className="rounded-xl border border-soft-border bg-white/70 p-4">
          <p className="text-xs uppercase tracking-[0.12em] text-slate-500">{t("dashboard.statDismissed")}</p>
          <p className="mt-2 text-2xl font-semibold text-amber-700">{stats.dismissed}</p>
        </article>
      </section>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-soft-border bg-surface-soft p-8 text-center text-sm text-slate-500">
          {t("dashboard.camerasEmpty")}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {items.map((sample) => {
            const typeLabel = eventTypeLabel(sample.eventType, locale);
            return (
              <article
                key={sample.id}
                className="overflow-hidden rounded-2xl border border-soft-border bg-white/80 shadow-[0_8px_24px_rgba(15,23,42,0.05)]"
              >
                {sample.snapshotId ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={`/api/snapshots/${sample.snapshotId}`}
                    alt={typeLabel}
                    className="h-44 w-full object-cover"
                  />
                ) : (
                  <div className="flex h-24 w-full items-center justify-center bg-slate-50 text-xs text-slate-400">
                    {typeLabel}
                  </div>
                )}
                <div className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-slate-900">{typeLabel}</p>
                      <p className="text-xs text-slate-500">
                        {sample.cameraCode ?? "-"} · {formatTime(sample.createdAt)}
                      </p>
                    </div>
                    <span className="rounded-full border border-soft-border bg-slate-50 px-2.5 py-1 text-xs text-slate-700">
                      {statusBadge(sample.reviewStatus)}
                    </span>
                  </div>

                  {sample.confidence != null ? (
                    <p className="text-xs font-medium text-accent">
                      {t("dashboard.eventCardConfidence")}: %{Math.round(sample.confidence * 100)}
                    </p>
                  ) : null}

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => updateStatus(sample.id, "dismissed")}
                      className={`rounded-lg border px-3 py-1.5 text-xs transition ${
                        sample.reviewStatus === "dismissed"
                          ? "border-amber-500 bg-amber-500/15 text-amber-700"
                          : "border-soft-border bg-white text-slate-700 hover:bg-amber-50"
                      }`}
                    >
                      {t("dashboard.btnNotViolation")}
                    </button>
                    <button
                      type="button"
                      onClick={() => updateStatus(sample.id, "confirmed_violation")}
                      className={`rounded-lg border px-3 py-1.5 text-xs transition ${
                        sample.reviewStatus === "confirmed_violation"
                          ? "border-emerald-500 bg-emerald-500/15 text-emerald-700"
                          : "border-soft-border bg-white text-slate-700 hover:bg-emerald-50"
                      }`}
                    >
                      {t("dashboard.btnViolation")}
                    </button>
                    <button
                      type="button"
                      onClick={() => updateStatus(sample.id, "pending")}
                      className="rounded-lg border border-soft-border bg-white px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
                    >
                      {t("dashboard.btnReset")}
                    </button>
                  </div>

                  <textarea
                    value={sample.reviewNote ?? ""}
                    onChange={(e) => updateNote(sample.id, e.target.value)}
                    onBlur={(e) => void persist(sample.id, { reviewNote: e.target.value })}
                    placeholder={t("dashboard.notePlaceholder")}
                    className="min-h-20 w-full rounded-lg border border-soft-border bg-slate-50 px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:border-accent/60 focus:outline-none"
                  />
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
