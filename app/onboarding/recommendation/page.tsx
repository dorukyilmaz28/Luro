"use client";

import { useI18n } from "@/components/i18n/I18nProvider";
import { useRouter } from "next/navigation";
import { useState } from "react";

const CAMERA_COUNTS = ["1-5", "6-20", "21-50", "50+"] as const;
const CONCERNS = ["ppe", "restricted_zone", "proximity", "general"] as const;

type Recommendation = {
  recommendation?: string;
  suggestedPlan?: string;
  topFeatures?: string[];
};

export default function OnboardingRecommendationPage() {
  const { t } = useI18n();
  const router = useRouter();
  const [cameraCount, setCameraCount] = useState<string>("");
  const [concerns, setConcerns] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Recommendation | null>(null);

  const toggleConcern = (key: string) => {
    setConcerns((cur) => (cur.includes(key) ? cur.filter((c) => c !== key) : [...cur, key]));
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/onboarding/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cameraCount, concerns }),
      });
      const data = (await res.json()) as { error?: string; recommendation?: Recommendation };
      if (!res.ok) {
        setError(data.error || t("signup.errGeneric"));
        setLoading(false);
        return;
      }
      setResult(data.recommendation ?? null);
    } catch {
      setError(t("signup.errGeneric"));
    } finally {
      setLoading(false);
    }
  };

  if (result) {
    return (
      <div>
        <div className="space-y-2 text-center">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-accent">
            {t("onboarding.recommendationReadyEyebrow")}
          </p>
          <h1 className="font-display text-2xl text-foreground sm:text-3xl">{t("onboarding.recommendationReadyTitle")}</h1>
        </div>

        <div className="mt-6 rounded-xl border border-accent/20 bg-accent/5 p-5">
          <p className="text-sm leading-7 text-foreground">{result.recommendation}</p>
        </div>

        <button
          type="button"
          onClick={() => {
            const suggested = typeof result.suggestedPlan === "string" ? result.suggestedPlan : "";
            router.push(suggested ? `/onboarding/plan?suggested=${encodeURIComponent(suggested)}` : "/onboarding/plan");
          }}
          className="mt-6 w-full rounded-full bg-accent px-4 py-3 text-sm font-semibold text-white transition hover:bg-accent-strong"
        >
          {t("onboarding.continue")}
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="space-y-2 text-center">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-accent">{t("onboarding.recommendationEyebrow")}</p>
        <h1 className="font-display text-2xl text-foreground sm:text-3xl">{t("onboarding.recommendationTitle")}</h1>
        <p className="text-sm leading-6 text-slate-600">{t("onboarding.recommendationSubtitle")}</p>
      </div>

      <div className="mt-8 space-y-6">
        <div>
          <p className="mb-3 text-xs font-medium uppercase tracking-wide text-slate-500">
            {t("onboarding.cameraCountQuestion")}
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {CAMERA_COUNTS.map((count) => (
              <button
                key={count}
                type="button"
                onClick={() => setCameraCount(count)}
                className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition ${
                  cameraCount === count
                    ? "border-accent bg-accent/10 text-accent"
                    : "border-soft-border bg-white text-slate-600 hover:border-accent/30"
                }`}
              >
                {count}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-3 text-xs font-medium uppercase tracking-wide text-slate-500">
            {t("onboarding.concernsQuestion")}
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {CONCERNS.map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => toggleConcern(key)}
                className={`rounded-xl border px-3 py-2.5 text-left text-sm font-medium transition ${
                  concerns.includes(key)
                    ? "border-accent bg-accent/10 text-accent"
                    : "border-soft-border bg-white text-slate-600 hover:border-accent/30"
                }`}
              >
                {t(`onboarding.concernOptions.${key}`)}
              </button>
            ))}
          </div>
        </div>

        {error ? (
          <p className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>
        ) : null}

        <button
          type="button"
          disabled={loading || !cameraCount}
          onClick={handleSubmit}
          className="w-full rounded-full bg-accent px-4 py-3 text-sm font-semibold text-white transition hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loading ? t("onboarding.thinking") : t("onboarding.getRecommendation")}
        </button>
      </div>
    </div>
  );
}
