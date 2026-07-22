"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/components/i18n/I18nProvider";

type Camera = {
  id: string;
  code: string;
  name: string;
  location: string | null;
  online: boolean;
  detectionEnabled: boolean;
  hasLive: boolean;
};

export function CameraCard({ camera }: { camera: Camera }) {
  const { t } = useI18n();
  const router = useRouter();
  const [enabled, setEnabled] = useState(camera.detectionEnabled);
  const [saving, setSaving] = useState(false);
  const [tick, setTick] = useState(Date.now());
  const [noFrame, setNoFrame] = useState(!camera.hasLive);
  const liveRef = useRef(camera.hasLive);

  // Reload the live frame every 3s (near-live).
  useEffect(() => {
    const timer = setInterval(() => {
      if (!document.hidden) setTick(Date.now());
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  const toggleDetection = async () => {
    const next = !enabled;
    setEnabled(next);
    setSaving(true);
    try {
      await fetch(`/api/cameras/${camera.id}/detection`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: next }),
      });
    } catch {
      setEnabled(!next);
    } finally {
      setSaving(false);
    }
  };

  const deleteCamera = async () => {
    if (!window.confirm(t("dashboard.deleteCameraConfirm"))) return;
    await fetch(`/api/cameras/${camera.id}`, { method: "DELETE" });
    router.refresh();
  };

  return (
    <article className="overflow-hidden rounded-2xl border border-soft-border bg-white/80 shadow-[0_8px_24px_rgba(15,23,42,0.05)]">
      <div className="relative aspect-video w-full bg-slate-900">
        {noFrame ? (
          <div className="absolute inset-0 flex items-center justify-center text-center text-xs text-slate-400">
            {t("dashboard.cameraNoLive")}
          </div>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/api/cameras/${camera.id}/live?t=${tick}`}
            alt={camera.name}
            className="absolute inset-0 h-full w-full object-cover"
            onError={() => {
              if (liveRef.current) setNoFrame(true);
            }}
            onLoad={() => {
              liveRef.current = true;
              setNoFrame(false);
            }}
          />
        )}
        <span
          className={`absolute left-2 top-2 inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] backdrop-blur ${
            camera.online ? "bg-emerald-500/80 text-white" : "bg-rose-500/80 text-white"
          }`}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-white" />
          {camera.online ? t("dashboard.online") : t("dashboard.offline")}
        </span>
      </div>

      <div className="space-y-3 p-4">
        <div>
          <p className="text-sm font-medium text-slate-900">{camera.name}</p>
          <p className="text-xs text-slate-500">
            {camera.code}
            {camera.location ? ` · ${camera.location}` : ""}
          </p>
        </div>

        <div className="flex items-center justify-between gap-2">
          <span className="text-sm text-slate-700">{t("dashboard.detection")}</span>
          <button
            type="button"
            role="switch"
            aria-checked={enabled}
            disabled={saving}
            onClick={toggleDetection}
            className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition ${
              enabled ? "bg-accent" : "bg-slate-300"
            } disabled:opacity-60`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition ${
                enabled ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>
        <p className="text-xs text-slate-500">
          {enabled ? t("dashboard.detectionOnHint") : t("dashboard.detectionOffHint")}
        </p>

        <div className="flex items-center gap-3 border-t border-soft-border pt-3">
          <Link href={`/dashboard/cameras/${camera.id}/zones`} className="text-xs font-medium text-accent">
            {t("dashboard.zones")}
          </Link>
          <button type="button" onClick={deleteCamera} className="text-xs font-medium text-rose-600 hover:text-rose-700">
            {t("dashboard.deleteCamera")}
          </button>
        </div>
      </div>
    </article>
  );
}
