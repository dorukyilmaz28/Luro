"use client";

import { useI18n } from "@/components/i18n/I18nProvider";
import { usePathname } from "next/navigation";

const STEPS = [
  { href: "/onboarding/company", labelKey: "onboarding.stepCompany" },
  { href: "/onboarding/recommendation", labelKey: "onboarding.stepRecommendation" },
  { href: "/onboarding/plan", labelKey: "onboarding.stepPlan" },
];

export function OnboardingStepper() {
  const { t } = useI18n();
  const pathname = usePathname();
  const currentIndex = STEPS.findIndex((s) => s.href === pathname);

  return (
    <div className="mb-8 flex items-center justify-center gap-2 sm:gap-4">
      {STEPS.map((step, index) => {
        const isActive = index === currentIndex;
        const isDone = currentIndex >= 0 && index < currentIndex;
        return (
          <div key={step.href} className="flex items-center gap-2 sm:gap-4">
            <div className="flex items-center gap-2">
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                  isDone
                    ? "bg-accent text-white"
                    : isActive
                      ? "border-2 border-accent text-accent"
                      : "border border-soft-border text-slate-400"
                }`}
              >
                {isDone ? "✓" : index + 1}
              </span>
              <span className={`hidden text-xs font-medium sm:inline ${isActive ? "text-foreground" : "text-slate-400"}`}>
                {t(step.labelKey)}
              </span>
            </div>
            {index < STEPS.length - 1 ? (
              <span className={`h-px w-6 sm:w-10 ${isDone ? "bg-accent" : "bg-soft-border"}`} />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
