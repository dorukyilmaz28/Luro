"use client";

import { useState } from "react";
import { useI18n } from "@/components/i18n/I18nProvider";

type Props = {
  initialEnabled: boolean;
};

export function AlertsToggle({ initialEnabled }: Props) {
  const { t } = useI18n();
  const [enabled, setEnabled] = useState(initialEnabled);
  const [saving, setSaving] = useState(false);

  const toggle = async () => {
    const next = !enabled;
    setEnabled(next);
    setSaving(true);
    try {
      await fetch("/api/settings/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: next }),
      });
    } catch {
      setEnabled(!next); // revert on failure
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="rounded-2xl border border-soft-border bg-surface-soft p-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.14em] text-slate-500">{t("dashboard.alertsSetting")}</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">{t("dashboard.alertsSettingDesc")}</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          disabled={saving}
          onClick={toggle}
          className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition ${
            enabled ? "bg-accent" : "bg-slate-300"
          } disabled:opacity-60`}
        >
          <span
            className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
              enabled ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      </div>
    </section>
  );
}
