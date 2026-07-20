"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { useI18n } from "@/components/i18n/I18nProvider";

type TestState = "idle" | "testing" | "reachable" | "unreachable";

export default function NewCameraPage() {
  const { t } = useI18n();
  const router = useRouter();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [location, setLocation] = useState("");
  const [rtspUrl, setRtspUrl] = useState("");
  const [testState, setTestState] = useState<TestState>("idle");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleTestConnection = async () => {
    if (!rtspUrl.trim()) return;
    setTestState("testing");
    try {
      const res = await fetch("/api/cameras/test-connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rtspUrl }),
      });
      const data = (await res.json()) as { reachable?: boolean };
      setTestState(data.reachable ? "reachable" : "unreachable");
    } catch {
      setTestState("unreachable");
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/cameras", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, code, location, rtspUrl }),
      });
      const data = (await res.json()) as { error?: string };

      if (!res.ok) {
        setError(data.error || t("dashboard.camerasEmpty"));
        setLoading(false);
        return;
      }

      router.push("/dashboard/cameras");
      router.refresh();
    } catch {
      setError(t("dashboard.camerasEmpty"));
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <div>
        <Link href="/dashboard/cameras" className="text-xs font-medium text-accent">
          {t("dashboard.backToCameras")}
        </Link>
        <p className="mt-3 text-xs uppercase tracking-[0.18em] text-accent">{t("dashboard.camerasEyebrow")}</p>
        <h1 className="mt-2 text-2xl font-medium tracking-tight text-slate-900">{t("dashboard.addCamera")}</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-soft-border bg-white/80 p-5 sm:p-6">
        <label className="block space-y-2">
          <span className="text-xs font-medium uppercase tracking-wide text-slate-500">{t("dashboard.cameraName")}</span>
          <input
            type="text"
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="w-full rounded-xl border border-soft-border bg-white px-4 py-3 text-sm text-foreground outline-none transition focus:border-accent/50 focus:ring-2 focus:ring-accent/10"
          />
        </label>

        <label className="block space-y-2">
          <span className="text-xs font-medium uppercase tracking-wide text-slate-500">{t("dashboard.cameraCode")}</span>
          <input
            type="text"
            required
            value={code}
            onChange={(event) => setCode(event.target.value)}
            placeholder="CAM-01"
            className="w-full rounded-xl border border-soft-border bg-white px-4 py-3 text-sm text-foreground outline-none transition focus:border-accent/50 focus:ring-2 focus:ring-accent/10"
          />
          <span className="block text-xs text-slate-400">{t("dashboard.cameraCodeHint")}</span>
        </label>

        <label className="block space-y-2">
          <span className="text-xs font-medium uppercase tracking-wide text-slate-500">{t("dashboard.cameraLocation")}</span>
          <input
            type="text"
            value={location}
            onChange={(event) => setLocation(event.target.value)}
            placeholder={t("dashboard.cameraLocationPlaceholder")}
            className="w-full rounded-xl border border-soft-border bg-white px-4 py-3 text-sm text-foreground outline-none transition focus:border-accent/50 focus:ring-2 focus:ring-accent/10"
          />
        </label>

        <label className="block space-y-2">
          <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
            {t("dashboard.cameraRtsp")} <span className="normal-case text-slate-400">{t("dashboard.cameraRtspOptional")}</span>
          </span>
          <input
            type="text"
            value={rtspUrl}
            onChange={(event) => {
              setRtspUrl(event.target.value);
              setTestState("idle");
            }}
            placeholder="rtsp://user:pass@192.168.1.20:554/stream"
            className="w-full rounded-xl border border-soft-border bg-white px-4 py-3 text-sm text-foreground outline-none transition focus:border-accent/50 focus:ring-2 focus:ring-accent/10"
          />
          <span className="block text-xs text-slate-400">{t("dashboard.cameraRtspHint")}</span>
        </label>

        {rtspUrl.trim() ? (
          <div className="space-y-2 rounded-xl border border-soft-border bg-surface-soft p-3">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={testState === "testing"}
              className="rounded-full border border-accent/30 px-3 py-1.5 text-xs font-medium text-accent transition hover:bg-accent/10 disabled:opacity-60"
            >
              {testState === "testing" ? t("dashboard.testing") : t("dashboard.testConnection")}
            </button>
            {testState === "reachable" ? (
              <p className="text-xs font-medium text-emerald-600">{t("dashboard.testReachable")}</p>
            ) : null}
            {testState === "unreachable" ? (
              <p className="text-xs font-medium text-amber-600">{t("dashboard.testUnreachable")}</p>
            ) : null}
            <p className="text-xs leading-5 text-slate-500">{t("dashboard.testHonesty")}</p>
          </div>
        ) : null}

        {error ? (
          <p className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>
        ) : null}

        <div className="flex items-center gap-3 pt-1">
          <button
            type="submit"
            disabled={loading}
            className="rounded-full bg-accent px-5 py-3 text-sm font-semibold text-white transition hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? t("dashboard.savingCamera") : t("dashboard.saveCamera")}
          </button>
          <Link href="/dashboard/cameras" className="text-sm font-medium text-slate-500 hover:text-slate-700">
            {t("dashboard.cancelCamera")}
          </Link>
        </div>
      </form>
    </div>
  );
}
