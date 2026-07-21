"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, MouseEvent } from "react";
import { useI18n } from "@/components/i18n/I18nProvider";

type Zone = {
  id: string;
  name: string;
  type: string;
  polygon: [number, number][];
};

type Props = {
  cameraId: string;
  snapshotId: string | null;
  initialZones: Zone[];
};

const ZONE_COLORS = ["#f43f5e", "#f59e0b", "#8b5cf6", "#0ea5e9", "#10b981"];

export function ZoneEditor({ cameraId, snapshotId, initialZones }: Props) {
  const { t } = useI18n();
  const router = useRouter();
  const boxRef = useRef<HTMLDivElement>(null);
  const [zones, setZones] = useState<Zone[]>(initialZones);
  const [points, setPoints] = useState<[number, number][]>([]);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addPoint = (e: MouseEvent<HTMLDivElement>) => {
    const rect = boxRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    const y = Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height));
    setPoints((prev) => [...prev, [Number(x.toFixed(4)), Number(y.toFixed(4))]]);
    setError(null);
  };

  const undoPoint = () => setPoints((prev) => prev.slice(0, -1));
  const clearPoints = () => setPoints([]);

  const saveZone = async () => {
    if (points.length < 3 || !name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/cameras/${cameraId}/zones`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), type: "restricted", polygon: points }),
      });
      const data = (await res.json()) as { zone?: Zone; error?: string };
      if (!res.ok || !data.zone) {
        setError(data.error || t("dashboard.zoneSaveError"));
        setSaving(false);
        return;
      }
      setZones((prev) => [data.zone!, ...prev]);
      setPoints([]);
      setName("");
    } catch {
      setError(t("dashboard.zoneSaveError"));
    } finally {
      setSaving(false);
    }
  };

  const deleteZone = async (id: string) => {
    if (!window.confirm(t("dashboard.zoneDeleteConfirm"))) return;
    setZones((prev) => prev.filter((z) => z.id !== id));
    await fetch(`/api/zones/${id}`, { method: "DELETE" });
    router.refresh();
  };

  const toPointsAttr = (poly: [number, number][]) => poly.map(([x, y]) => `${x * 100},${y * 100}`).join(" ");

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr,320px]">
      <div>
        <div
          ref={boxRef}
          onClick={addPoint}
          className="relative aspect-video w-full cursor-crosshair overflow-hidden rounded-2xl border border-soft-border bg-slate-900 select-none"
        >
          {snapshotId ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`/api/snapshots/${snapshotId}`}
              alt="camera"
              draggable={false}
              className="pointer-events-none absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-[linear-gradient(45deg,#1e293b_25%,transparent_25%,transparent_75%,#1e293b_75%),linear-gradient(45deg,#1e293b_25%,#0f172a_25%,#0f172a_75%,#1e293b_75%)] bg-[length:24px_24px] bg-[position:0_0,12px_12px] p-4 text-center text-xs text-slate-400">
              {t("dashboard.zoneNoSnapshot")}
            </div>
          )}

          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            className="pointer-events-none absolute inset-0 h-full w-full"
          >
            {zones.map((z, i) => (
              <polygon
                key={z.id}
                points={toPointsAttr(z.polygon)}
                fill={ZONE_COLORS[i % ZONE_COLORS.length]}
                fillOpacity={0.25}
                stroke={ZONE_COLORS[i % ZONE_COLORS.length]}
                strokeWidth={2}
                vectorEffect="non-scaling-stroke"
              />
            ))}
            {points.length > 0 && (
              <polygon
                points={toPointsAttr(points)}
                fill="#2f6fb0"
                fillOpacity={0.2}
                stroke="#2f6fb0"
                strokeWidth={2}
                strokeDasharray="4 3"
                vectorEffect="non-scaling-stroke"
              />
            )}
          </svg>

          {points.map(([x, y], i) => (
            <span
              key={i}
              className="pointer-events-none absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white bg-accent"
              style={{ left: `${x * 100}%`, top: `${y * 100}%` }}
            />
          ))}
        </div>
        <p className="mt-2 text-xs text-slate-500">{t("dashboard.zoneHint")}</p>
      </div>

      <div className="space-y-4">
        <div className="rounded-2xl border border-soft-border bg-white/80 p-4">
          <p className="text-sm font-medium text-slate-900">{t("dashboard.zoneNewTitle")}</p>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("dashboard.zoneNamePlaceholder")}
            className="mt-3 w-full rounded-xl border border-soft-border bg-white px-3 py-2 text-sm outline-none focus:border-accent/50 focus:ring-2 focus:ring-accent/10"
          />
          <p className="mt-2 text-xs text-slate-500">
            {t("dashboard.zonePointCount")}: {points.length}
          </p>
          {error ? <p className="mt-2 text-xs text-danger">{error}</p> : null}
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={saveZone}
              disabled={saving || points.length < 3 || !name.trim()}
              className="rounded-full bg-accent px-4 py-2 text-xs font-semibold text-white transition hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? t("dashboard.savingCamera") : t("dashboard.zoneSave")}
            </button>
            <button
              type="button"
              onClick={undoPoint}
              disabled={points.length === 0}
              className="rounded-full border border-soft-border bg-white px-3 py-2 text-xs text-slate-700 disabled:opacity-50"
            >
              {t("dashboard.zoneUndo")}
            </button>
            <button
              type="button"
              onClick={clearPoints}
              disabled={points.length === 0}
              className="rounded-full border border-soft-border bg-white px-3 py-2 text-xs text-slate-700 disabled:opacity-50"
            >
              {t("dashboard.zoneClear")}
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-soft-border bg-white/80 p-4">
          <p className="text-sm font-medium text-slate-900">{t("dashboard.zoneListTitle")}</p>
          {zones.length === 0 ? (
            <p className="mt-2 text-xs text-slate-500">{t("dashboard.zoneEmpty")}</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {zones.map((z, i) => (
                <li key={z.id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="flex items-center gap-2">
                    <span
                      className="h-3 w-3 rounded-sm"
                      style={{ backgroundColor: ZONE_COLORS[i % ZONE_COLORS.length] }}
                    />
                    <span className="text-slate-800">{z.name}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => deleteZone(z.id)}
                    className="text-xs font-medium text-rose-600 hover:text-rose-700"
                  >
                    {t("dashboard.deleteCamera")}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
