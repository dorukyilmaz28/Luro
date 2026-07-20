import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";
import { OnboardingStepper } from "@/components/onboarding/OnboardingStepper";

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative flex min-h-screen flex-col items-center bg-grid-soft px-4 py-12 text-foreground sm:px-6">
      <div className="absolute right-4 top-4 sm:right-6 sm:top-6">
        <LanguageSwitcher compact />
      </div>
      <div className="w-full max-w-xl">
        <OnboardingStepper />
        <div className="rounded-2xl border border-soft-border bg-surface-soft p-6 shadow-[var(--shadow-soft)] sm:p-8">
          {children}
        </div>
      </div>
    </main>
  );
}
