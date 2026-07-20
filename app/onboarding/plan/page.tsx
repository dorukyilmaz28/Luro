"use client";

import { useI18n } from "@/components/i18n/I18nProvider";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

const PLANS = [
  { key: "baslangic", cameras: "1-5" },
  { key: "profesyonel", cameras: "6-20" },
  { key: "kurumsal", cameras: "20+" },
] as const;

function PlanSelector() {
  const { t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const suggested = searchParams.get("suggested");

  const [selected, setSelected] = useState<string>(suggested || "profesyonel");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/onboarding/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: selected }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error || t("signup.errGeneric"));
        setLoading(false);
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError(t("signup.errGeneric"));
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="space-y-2 text-center">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-accent">{t("onboarding.planEyebrow")}</p>
        <h1 className="font-display text-2xl text-foreground sm:text-3xl">{t("onboarding.planTitle")}</h1>
        <p className="text-sm leading-6 text-slate-600">{t("onboarding.planSubtitle")}</p>
      </div>

      <div className="mt-8 grid gap-3">
        {PLANS.map((plan) => {
          const isSelected = selected === plan.key;
          const isSuggested = suggested === plan.key;
          return (
            <button
              key={plan.key}
              type="button"
              onClick={() => setSelected(plan.key)}
              className={`rounded-2xl border-2 p-5 text-left transition ${
                isSelected ? "border-accent bg-accent/5" : "border-soft-border bg-white hover:border-accent/30"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="font-display text-lg text-foreground">{t(`onboarding.plans.${plan.key}.name`)}</span>
                  {isSuggested ? (
                    <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent">
                      {t("onboarding.aiSuggested")}
                    </span>
                  ) : null}
                </div>
                <span
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                    isSelected ? "border-accent bg-accent" : "border-soft-border"
                  }`}
                >
                  {isSelected ? <span className="h-2 w-2 rounded-full bg-white" /> : null}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-500">{plan.cameras} {t("onboarding.cameras")}</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">{t(`onboarding.plans.${plan.key}.desc`)}</p>
            </button>
          );
        })}
      </div>

      <p className="mt-4 text-center text-xs text-slate-500">{t("onboarding.pricingNote")}</p>

      {error ? (
        <p className="mt-4 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>
      ) : null}

      <button
        type="button"
        disabled={loading}
        onClick={handleConfirm}
        className="mt-6 w-full rounded-full bg-accent px-4 py-3 text-sm font-semibold text-white transition hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-70"
      >
        {loading ? t("onboarding.saving") : t("onboarding.finish")}
      </button>
    </div>
  );
}

export default function OnboardingPlanPage() {
  return (
    <Suspense>
      <PlanSelector />
    </Suspense>
  );
}
