"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/components/i18n/I18nProvider";

type AutoRefreshProps = {
  /** Poll interval in milliseconds. */
  intervalMs?: number;
};

/**
 * Re-runs the server component's data fetch on an interval via router.refresh(),
 * so the page reflects newly ingested events without a manual reload.
 * Pauses while the tab is hidden to avoid needless work.
 */
export function AutoRefresh({ intervalMs = 10000 }: AutoRefreshProps) {
  const router = useRouter();
  const { t } = useI18n();
  const [live, setLive] = useState(true);
  const [pulse, setPulse] = useState(false);
  const liveRef = useRef(live);
  liveRef.current = live;

  useEffect(() => {
    const tick = () => {
      if (!liveRef.current || document.hidden) return;
      router.refresh();
      setPulse(true);
      setTimeout(() => setPulse(false), 600);
    };
    const id = setInterval(tick, intervalMs);
    return () => clearInterval(id);
  }, [router, intervalMs]);

  return (
    <button
      type="button"
      onClick={() => setLive((v) => !v)}
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
        live
          ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700"
          : "border-soft-border bg-white text-slate-500"
      }`}
      title={live ? t("dashboard.livePause") : t("dashboard.liveResume")}
    >
      <span
        className={`h-2 w-2 rounded-full ${
          live ? (pulse ? "bg-emerald-500" : "bg-emerald-500 animate-pulse") : "bg-slate-400"
        }`}
      />
      {live ? t("dashboard.liveOn") : t("dashboard.liveOff")}
    </button>
  );
}
