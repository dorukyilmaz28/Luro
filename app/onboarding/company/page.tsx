"use client";

import { useI18n } from "@/components/i18n/I18nProvider";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

const INDUSTRIES = ["construction", "warehouse", "logistics", "manufacturing", "other"] as const;
const SIZES = ["1-10", "11-50", "51-200", "200+"] as const;

export default function OnboardingCompanyPage() {
  const { t } = useI18n();
  const router = useRouter();
  const [companyName, setCompanyName] = useState("");
  const [industry, setIndustry] = useState<string>("");
  const [companySize, setCompanySize] = useState<string>("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/onboarding/company", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyName, industry, companySize, phone }),
      });
      const data = (await res.json()) as { error?: string };

      if (!res.ok) {
        setError(data.error || t("signup.errGeneric"));
        setLoading(false);
        return;
      }

      router.push("/onboarding/recommendation");
      router.refresh();
    } catch {
      setError(t("signup.errGeneric"));
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="space-y-2 text-center">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-accent">{t("onboarding.companyEyebrow")}</p>
        <h1 className="font-display text-2xl text-foreground sm:text-3xl">{t("onboarding.companyTitle")}</h1>
        <p className="text-sm leading-6 text-slate-600">{t("onboarding.companySubtitle")}</p>
      </div>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <label className="block space-y-2">
          <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
            {t("onboarding.companyName")}
          </span>
          <input
            type="text"
            required
            value={companyName}
            onChange={(event) => setCompanyName(event.target.value)}
            className="w-full rounded-xl border border-soft-border bg-white px-4 py-3 text-sm text-foreground outline-none transition focus:border-accent/50 focus:ring-2 focus:ring-accent/10"
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block space-y-2">
            <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
              {t("onboarding.industry")}
            </span>
            <select
              required
              value={industry}
              onChange={(event) => setIndustry(event.target.value)}
              className="w-full rounded-xl border border-soft-border bg-white px-4 py-3 text-sm text-foreground outline-none transition focus:border-accent/50 focus:ring-2 focus:ring-accent/10"
            >
              <option value="" disabled>
                {t("onboarding.selectPlaceholder")}
              </option>
              {INDUSTRIES.map((key) => (
                <option key={key} value={key}>
                  {t(`onboarding.industryOptions.${key}`)}
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-2">
            <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
              {t("onboarding.companySize")}
            </span>
            <select
              required
              value={companySize}
              onChange={(event) => setCompanySize(event.target.value)}
              className="w-full rounded-xl border border-soft-border bg-white px-4 py-3 text-sm text-foreground outline-none transition focus:border-accent/50 focus:ring-2 focus:ring-accent/10"
            >
              <option value="" disabled>
                {t("onboarding.selectPlaceholder")}
              </option>
              {SIZES.map((key) => (
                <option key={key} value={key}>
                  {key} {t("onboarding.employees")}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="block space-y-2">
          <span className="text-xs font-medium uppercase tracking-wide text-slate-500">{t("onboarding.phone")}</span>
          <input
            type="tel"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            className="w-full rounded-xl border border-soft-border bg-white px-4 py-3 text-sm text-foreground outline-none transition focus:border-accent/50 focus:ring-2 focus:ring-accent/10"
            placeholder={t("onboarding.phonePlaceholder")}
          />
        </label>

        {error ? (
          <p className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>
        ) : null}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-full bg-accent px-4 py-3 text-sm font-semibold text-white transition hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loading ? t("onboarding.saving") : t("onboarding.continue")}
        </button>
      </form>
    </div>
  );
}
