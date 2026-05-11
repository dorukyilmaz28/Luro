"use client";

import { useI18n } from "@/components/i18n/I18nProvider";
import { chartLocaleTag, localizeMockCopy } from "@/lib/i18n/display";
import Image from "next/image";
import { useMemo, useState } from "react";
import { aiTrainingQueue, type TrainingFeedbackStatus, type TrainingSample } from "@/lib/mock/dashboard";

function downloadText(filename: string, content: string, mime = "text/plain") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function AiTrainingPage() {
  const { locale, t } = useI18n();
  const [samples, setSamples] = useState<TrainingSample[]>(aiTrainingQueue);

  const formatTime = (timestamp: string) =>
    new Intl.DateTimeFormat(chartLocaleTag(locale), {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(timestamp));

  const stats = useMemo(() => {
    const pending = samples.filter((s) => s.status === "pending").length;
    const confirmed = samples.filter((s) => s.status === "confirmed_violation").length;
    const dismissed = samples.filter((s) => s.status === "dismissed").length;
    return { pending, confirmed, dismissed };
  }, [samples]);

  function statusBadge(status: TrainingFeedbackStatus) {
    if (status === "confirmed_violation") return t("dashboard.statusConfirmed");
    if (status === "dismissed") return t("dashboard.statusDismissed");
    return t("dashboard.statusPending");
  }

  function updateStatus(id: string, status: TrainingFeedbackStatus) {
    setSamples((prev) => prev.map((sample) => (sample.id === id ? { ...sample, status } : sample)));
  }

  function updateNote(id: string, note: string) {
    setSamples((prev) => prev.map((sample) => (sample.id === id ? { ...sample, note } : sample)));
  }

  function exportJson() {
    downloadText(
      "ai-training-feedback.json",
      JSON.stringify(
        {
          exportedAt: new Date().toISOString(),
          items: samples,
        },
        null,
        2,
      ),
      "application/json",
    );
  }

  function exportCsv() {
    const header = ["id", "eventType", "cameraId", "timestamp", "confidence", "status", "note"];
    const lines = samples.map((s) =>
      [s.id, s.eventType, s.cameraId, s.timestamp, s.confidence.toString(), s.status, s.note ?? ""]
        .map((field) => `"${field.replaceAll('"', '""')}"`)
        .join(","),
    );
    downloadText("ai-training-feedback.csv", [header.join(","), ...lines].join("\n"), "text/csv");
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-[#d4a64a]">{t("dashboard.aiEyebrow")}</p>
          <h1 className="mt-2 text-2xl font-medium tracking-tight text-slate-900">{t("dashboard.aiTitle")}</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">{t("dashboard.aiBody")}</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={exportJson}
            className="rounded-lg border border-[#d6c6b2] bg-white/70 px-3 py-2 text-sm text-slate-700 hover:bg-white"
          >
            {t("dashboard.exportJson")}
          </button>
          <button
            type="button"
            onClick={exportCsv}
            className="rounded-lg border border-[#d6c6b2] bg-white/70 px-3 py-2 text-sm text-slate-700 hover:bg-white"
          >
            {t("dashboard.exportCsv")}
          </button>
        </div>
      </div>

      <section className="grid gap-3 sm:grid-cols-3">
        <article className="rounded-xl border border-[#e6d9ca] bg-white/70 p-4">
          <p className="text-xs uppercase tracking-[0.12em] text-slate-500">{t("dashboard.statPending")}</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{stats.pending}</p>
        </article>
        <article className="rounded-xl border border-[#e6d9ca] bg-white/70 p-4">
          <p className="text-xs uppercase tracking-[0.12em] text-slate-500">{t("dashboard.statConfirmed")}</p>
          <p className="mt-2 text-2xl font-semibold text-emerald-700">{stats.confirmed}</p>
        </article>
        <article className="rounded-xl border border-[#e6d9ca] bg-white/70 p-4">
          <p className="text-xs uppercase tracking-[0.12em] text-slate-500">{t("dashboard.statDismissed")}</p>
          <p className="mt-2 text-2xl font-semibold text-amber-700">{stats.dismissed}</p>
        </article>
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        {samples.map((sample) => {
          const typeLabel = localizeMockCopy(sample.eventType, locale);
          return (
            <article
              key={sample.id}
              className="overflow-hidden rounded-2xl border border-[#e6d9ca] bg-white/80 shadow-[0_8px_24px_rgba(15,23,42,0.05)]"
            >
              <div className="relative h-44 w-full">
                <Image src={sample.imageUrl} alt={typeLabel} fill className="object-cover" />
              </div>
              <div className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{typeLabel}</p>
                    <p className="text-xs text-slate-500">
                      {sample.cameraId} · {formatTime(sample.timestamp)}
                    </p>
                  </div>
                  <span className="rounded-full border border-[#ddcfbf] bg-[#f8f3ec] px-2.5 py-1 text-xs text-slate-700">
                    {statusBadge(sample.status)}
                  </span>
                </div>

                <p className="text-xs font-medium text-[#8b6d2f]">
                  {t("dashboard.eventCardConfidence")}: %{Math.round(sample.confidence * 100)}
                </p>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => updateStatus(sample.id, "dismissed")}
                    className="rounded-lg border border-amber-400/40 bg-amber-400/10 px-3 py-1.5 text-xs text-amber-200 hover:bg-amber-400/20"
                  >
                    {t("dashboard.btnNotViolation")}
                  </button>
                  <button
                    type="button"
                    onClick={() => updateStatus(sample.id, "confirmed_violation")}
                    className="rounded-lg border border-emerald-400/40 bg-emerald-400/10 px-3 py-1.5 text-xs text-emerald-200 hover:bg-emerald-400/20"
                  >
                    {t("dashboard.btnViolation")}
                  </button>
                  <button
                    type="button"
                    onClick={() => updateStatus(sample.id, "pending")}
                    className="rounded-lg border border-[#d6c6b2] bg-white px-3 py-1.5 text-xs text-slate-700 hover:bg-[#f8f3ec]"
                  >
                    {t("dashboard.btnReset")}
                  </button>
                </div>

                <textarea
                  value={sample.note ?? ""}
                  onChange={(e) => updateNote(sample.id, e.target.value)}
                  placeholder={t("dashboard.notePlaceholder")}
                  className="min-h-20 w-full rounded-lg border border-[#ddcfbf] bg-[#fcf9f5] px-3 py-2 text-xs text-slate-800 placeholder:text-slate-500 focus:border-[#d4a64a]/60 focus:outline-none"
                />
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
