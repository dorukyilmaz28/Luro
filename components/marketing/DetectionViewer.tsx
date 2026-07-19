"use client";

import Image from "next/image";
import { useState } from "react";
import type { DetectionResult } from "@/lib/detection/sample";

type StatusRow = {
  key: string;
  ok: boolean;
};

type PersonInfo = {
  index: number;
  bbox: [number, number, number, number];
  confidence: number;
  rows: StatusRow[];
  violationCount: number;
};

const STATUS_LABELS: Record<string, string> = {
  hardhat: "Baret",
  safety_vest: "Yelek",
  safety_gloves: "Eldiven",
  safety_boots: "Bot",
  safety_goggles: "Gözlük",
  restricted_zone: "Yasaklı Bölge",
  unsafe_proximity: "Yakınlık",
  fall: "Düşme",
};

const EVENT_TO_ROW: Record<string, string> = {
  no_hardhat: "hardhat",
  no_vest: "safety_vest",
  no_safety_vest: "safety_vest",
  no_safety_gloves: "safety_gloves",
  no_safety_boots: "safety_boots",
  no_safety_goggles: "safety_goggles",
  restricted_zone_entry: "restricted_zone",
  unsafe_proximity: "unsafe_proximity",
  person_fall_suspected: "fall",
};

const ROW_ORDER = [
  "hardhat",
  "safety_vest",
  "safety_gloves",
  "safety_boots",
  "safety_goggles",
  "restricted_zone",
  "unsafe_proximity",
  "fall",
];

function bboxClose(a: number[], b: number[], tol = 3) {
  return a.length === 4 && b.length === 4 && a.every((v, i) => Math.abs(v - b[i]) <= tol);
}

function buildPersons(result: DetectionResult): PersonInfo[] {
  return result.detections
    .filter((d) => d.className === "person")
    .map((person, index) => {
      const failed = new Set<string>();
      for (const evt of result.events) {
        if (!bboxClose(evt.personBbox, person.bbox)) continue;
        const rowKey = EVENT_TO_ROW[evt.eventType];
        if (rowKey) failed.add(rowKey);
      }
      const rows = ROW_ORDER.map((key) => ({ key, ok: !failed.has(key) }));
      return {
        index,
        bbox: person.bbox,
        confidence: person.confidence,
        rows,
        violationCount: failed.size,
      };
    });
}

function toPercentBox(bbox: [number, number, number, number], w: number, h: number) {
  const [x1, y1, x2, y2] = bbox;
  return {
    left: (x1 / w) * 100,
    top: (y1 / h) * 100,
    width: ((x2 - x1) / w) * 100,
    height: ((y2 - y1) / h) * 100,
  };
}

const PANEL_WIDTH_PX = 200;

export function DetectionViewer({
  imageSrc,
  imageAlt,
  result,
}: {
  imageSrc: string;
  imageAlt: string;
  result: DetectionResult;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const [hasInteracted, setHasInteracted] = useState(false);
  const persons = buildPersons(result);

  return (
    <div className="relative select-none">
      <div className="relative overflow-visible rounded-2xl">
        <div
          className="relative w-full overflow-hidden rounded-2xl border border-soft-border bg-black shadow-[var(--shadow-soft)]"
          style={{ aspectRatio: `${result.imageWidth} / ${result.imageHeight}` }}
        >
          <Image
            src={imageSrc}
            alt={imageAlt}
            fill
            priority
            sizes="(min-width: 1024px) 640px, 100vw"
            className="object-cover"
          />

          {persons.map((person) => {
            const box = toPercentBox(person.bbox, result.imageWidth, result.imageHeight);
            const hasViolation = person.violationCount > 0;
            return (
              <div
                key={person.index}
                className={`pointer-events-none absolute rounded-lg border transition-colors ${
                  hasViolation ? "border-danger/70 bg-danger/10" : "border-emerald-400/60 bg-emerald-400/10"
                }`}
                style={{ left: `${box.left}%`, top: `${box.top}%`, width: `${box.width}%`, height: `${box.height}%` }}
              />
            );
          })}
        </div>

        {/* Badges + detail panels live outside the image's clipping box so an
            expanded panel near an edge never gets cut off. */}
        {persons.map((person) => {
          const box = toPercentBox(person.bbox, result.imageWidth, result.imageHeight);
          const hasViolation = person.violationCount > 0;
          const isSelected = selected === person.index;
          const spaceRight = 100 - (box.left + box.width);
          const spaceLeft = box.left;
          const anchorRight = spaceRight >= spaceLeft;

          return (
            <div key={person.index}>
              <button
                type="button"
                onClick={() => {
                  setHasInteracted(true);
                  setSelected((cur) => (cur === person.index ? null : person.index));
                }}
                className={`group absolute z-10 flex -translate-y-1/2 items-center gap-1.5 rounded-full border-2 px-2.5 py-1.5 text-[11px] font-semibold text-white shadow-lg backdrop-blur transition-transform hover:scale-105 ${
                  hasViolation ? "border-danger bg-[rgba(18,18,24,0.92)]" : "border-emerald-400 bg-[rgba(18,18,24,0.92)]"
                } ${!hasInteracted ? "animate-bounce" : ""}`}
                style={{
                  left: `${box.left}%`,
                  top: `${box.top}%`,
                  boxShadow: hasViolation
                    ? "0 0 0 4px rgba(193,85,76,0.35), 0 8px 20px rgba(0,0,0,.35)"
                    : "0 0 0 4px rgba(52,211,153,0.3), 0 8px 20px rgba(0,0,0,.35)",
                }}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${hasViolation ? "bg-danger" : "bg-emerald-400"}`}
                  aria-hidden
                />
                Kişi {person.index + 1} · {hasViolation ? `${person.violationCount} İhlal` : "Uygun"}
                <svg
                  viewBox="0 0 24 24"
                  className={`h-3 w-3 shrink-0 opacity-80 transition-transform ${isSelected ? "rotate-180" : ""}`}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" />
                </svg>
              </button>

              {isSelected && (
                <div
                  className="absolute z-20 rounded-2xl border border-white/10 bg-[rgba(18,18,24,0.98)] p-3.5 text-white shadow-2xl backdrop-blur"
                  style={{
                    width: PANEL_WIDTH_PX,
                    maxWidth: "calc(100vw - 3rem)",
                    left: anchorRight ? `${box.left + box.width}%` : undefined,
                    right: anchorRight ? undefined : `${100 - box.left}%`,
                    top: `${box.top}%`,
                    marginLeft: anchorRight ? "8px" : undefined,
                    marginRight: anchorRight ? undefined : "8px",
                  }}
                >
                  <div className="mb-2.5 flex items-center gap-2">
                    <span
                      className={`h-2 w-2 rounded-full ${hasViolation ? "bg-danger" : "bg-emerald-400"}`}
                      aria-hidden
                    />
                    <span className="text-[13px] font-bold">
                      Kişi {person.index + 1} · {hasViolation ? `${person.violationCount} İhlal` : "Uygun"}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {person.rows.map((row) => (
                      <div
                        key={row.key}
                        className={`rounded-md px-2 py-1 text-[10.5px] ${
                          row.ok ? "bg-emerald-400/15 text-emerald-200" : "bg-danger/20 text-red-200"
                        }`}
                      >
                        {STATUS_LABELS[row.key]}
                        {row.ok ? " ✓" : " ✕"}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-center text-xs text-slate-500">
        Gerçek model çıktısı — <span className="font-medium text-accent">bir kişiye tıklayarak</span> tüm tespit
        detaylarını görün.
      </p>
    </div>
  );
}
