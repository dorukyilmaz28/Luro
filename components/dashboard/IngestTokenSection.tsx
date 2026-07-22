"use client";

import { useState } from "react";
import { useI18n } from "@/components/i18n/I18nProvider";

type IngestTokenSectionProps = {
  initialToken: string | null;
};

export function IngestTokenSection({ initialToken }: IngestTokenSectionProps) {
  const { t } = useI18n();
  const [token, setToken] = useState<string | null>(initialToken);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    if (token && !window.confirm(t("dashboard.connectorRegenWarning"))) return;
    setLoading(true);
    try {
      const res = await fetch("/api/settings/ingest-token", { method: "POST" });
      const data = (await res.json()) as { token?: string };
      if (data.token) setToken(data.token);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!token) return;
    await navigator.clipboard.writeText(token);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section className="rounded-2xl border border-soft-border bg-surface-soft p-5">
      <p className="text-xs uppercase tracking-[0.14em] text-slate-500">{t("dashboard.settingsConnector")}</p>
      <p className="mt-2 text-sm leading-6 text-slate-600">{t("dashboard.connectorDesc")}</p>

      {token ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <code className="max-w-full overflow-x-auto rounded-lg border border-soft-border bg-white px-3 py-2 font-mono text-xs text-slate-800">
            {token}
          </code>
          <button
            type="button"
            onClick={handleCopy}
            className="rounded-full border border-accent/30 px-3 py-1.5 text-xs font-medium text-accent transition hover:bg-accent/10"
          >
            {copied ? t("dashboard.connectorCopied") : t("dashboard.connectorCopy")}
          </button>
        </div>
      ) : (
        <p className="mt-3 text-sm text-slate-500">{t("dashboard.connectorNoToken")}</p>
      )}

      <button
        type="button"
        onClick={handleGenerate}
        disabled={loading}
        className="mt-4 rounded-full bg-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-accent-strong disabled:opacity-60"
      >
        {loading
          ? t("dashboard.connectorGenerating")
          : token
            ? t("dashboard.connectorRegenerate")
            : t("dashboard.connectorGenerate")}
      </button>

      {process.env.NEXT_PUBLIC_CONNECTOR_URL ? (
        <div className="mt-5 border-t border-soft-border pt-4">
          <p className="text-sm text-slate-600">{t("dashboard.connectorDownloadDesc")}</p>
          <a
            href={process.env.NEXT_PUBLIC_CONNECTOR_URL}
            className="mt-3 inline-flex items-center gap-2 rounded-full border border-accent/30 bg-white px-4 py-2 text-sm font-medium text-accent transition hover:bg-accent/10"
          >
            ⬇ {t("dashboard.connectorDownload")}
          </a>
        </div>
      ) : null}
    </section>
  );
}
