"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { aiTrainingQueue, type TrainingFeedbackStatus, type TrainingSample } from "@/lib/mock/dashboard";

function formatTime(timestamp: string) {
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(timestamp));
}

function downloadText(filename: string, content: string, mime = "text/plain") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function statusBadge(status: TrainingFeedbackStatus) {
  if (status === "confirmed_violation") return "Doğrulandı";
  if (status === "dismissed") return "İhlal Değil";
  return "İncelenmedi";
}

export default function AiTrainingPage() {
  const [samples, setSamples] = useState<TrainingSample[]>(aiTrainingQueue);

  const stats = useMemo(() => {
    const pending = samples.filter((s) => s.status === "pending").length;
    const confirmed = samples.filter((s) => s.status === "confirmed_violation").length;
    const dismissed = samples.filter((s) => s.status === "dismissed").length;
    return { pending, confirmed, dismissed };
  }, [samples]);

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
          <p className="text-xs uppercase tracking-[0.18em] text-[#d4a64a]">İnsan Destekli Öğrenme</p>
          <h1 className="mt-2 text-2xl font-medium tracking-tight text-slate-900">Yapay Zeka Eğitim Modu</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            Yönetici yanlış alarmları &quot;İhlal Değil&quot; olarak işaretleyip not ekleyebilir. Bu geri bildirimler
            sonraki eğitim döngüsünde modele özel iyileştirme verisi olarak kullanılabilir.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={exportJson}
            className="rounded-lg border border-[#d6c6b2] bg-white/70 px-3 py-2 text-sm text-slate-700 hover:bg-white"
          >
            JSON Dışa Aktar
          </button>
          <button
            onClick={exportCsv}
            className="rounded-lg border border-[#d6c6b2] bg-white/70 px-3 py-2 text-sm text-slate-700 hover:bg-white"
          >
            CSV Dışa Aktar
          </button>
        </div>
      </div>

      <section className="grid gap-3 sm:grid-cols-3">
        <article className="rounded-xl border border-[#e6d9ca] bg-white/70 p-4">
          <p className="text-xs uppercase tracking-[0.12em] text-slate-500">İncelenmeyi Bekleyen</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{stats.pending}</p>
        </article>
        <article className="rounded-xl border border-[#e6d9ca] bg-white/70 p-4">
          <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Doğrulanan İhlal</p>
          <p className="mt-2 text-2xl font-semibold text-emerald-700">{stats.confirmed}</p>
        </article>
        <article className="rounded-xl border border-[#e6d9ca] bg-white/70 p-4">
          <p className="text-xs uppercase tracking-[0.12em] text-slate-500">İhlal Değil (False Positive)</p>
          <p className="mt-2 text-2xl font-semibold text-amber-700">{stats.dismissed}</p>
        </article>
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        {samples.map((sample) => (
          <article key={sample.id} className="overflow-hidden rounded-2xl border border-[#e6d9ca] bg-white/80 shadow-[0_8px_24px_rgba(15,23,42,0.05)]">
            <div className="relative h-44 w-full">
              <Image src={sample.imageUrl} alt={sample.eventType} fill className="object-cover" />
            </div>
            <div className="space-y-3 p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-slate-900">{sample.eventType}</p>
                  <p className="text-xs text-slate-500">
                    {sample.cameraId} · {formatTime(sample.timestamp)}
                  </p>
                </div>
                <span className="rounded-full border border-[#ddcfbf] bg-[#f8f3ec] px-2.5 py-1 text-xs text-slate-700">
                  {statusBadge(sample.status)}
                </span>
              </div>

              <p className="text-xs font-medium text-[#8b6d2f]">Güven: %{Math.round(sample.confidence * 100)}</p>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => updateStatus(sample.id, "dismissed")}
                  className="rounded-lg border border-amber-400/40 bg-amber-400/10 px-3 py-1.5 text-xs text-amber-200 hover:bg-amber-400/20"
                >
                  Hayır, bu bir ihlal değil
                </button>
                <button
                  onClick={() => updateStatus(sample.id, "confirmed_violation")}
                  className="rounded-lg border border-emerald-400/40 bg-emerald-400/10 px-3 py-1.5 text-xs text-emerald-200 hover:bg-emerald-400/20"
                >
                  Evet, bu gerçek ihlal
                </button>
                <button
                  onClick={() => updateStatus(sample.id, "pending")}
                  className="rounded-lg border border-[#d6c6b2] bg-white px-3 py-1.5 text-xs text-slate-700 hover:bg-[#f8f3ec]"
                >
                  Sıfırla
                </button>
              </div>

              <textarea
                value={sample.note ?? ""}
                onChange={(e) => updateNote(sample.id, e.target.value)}
                placeholder="Opsiyonel not (örn. ‘Operatör yeleği gölgede kaldı’)"
                className="min-h-20 w-full rounded-lg border border-[#ddcfbf] bg-[#fcf9f5] px-3 py-2 text-xs text-slate-800 placeholder:text-slate-500 focus:border-[#d4a64a]/60 focus:outline-none"
              />
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
