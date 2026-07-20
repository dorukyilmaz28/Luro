"use client";

import { useI18n } from "@/components/i18n/I18nProvider";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";
import { useAuth } from "@/components/auth/AuthProvider";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useState } from "react";

const RESEND_COOLDOWN_SECONDS = 60;

function VerifyForm() {
  const { t } = useI18n();
  const router = useRouter();
  const { refresh } = useAuth();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";

  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (!email) router.replace("/signup");
  }, [email, router]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });
      const data = (await res.json()) as { error?: string };

      if (!res.ok) {
        setError(data.error || t("signup.errGeneric"));
        setLoading(false);
        return;
      }

      await refresh();
      router.replace("/onboarding/company");
      router.refresh();
    } catch {
      setError(t("signup.errGeneric"));
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0) return;
    setError(null);
    try {
      const res = await fetch("/api/auth/otp/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error || t("signup.errGeneric"));
        return;
      }
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } catch {
      setError(t("signup.errGeneric"));
    }
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center bg-grid-soft px-4 py-12 text-foreground sm:px-6">
      <div className="absolute right-4 top-4 sm:right-6 sm:top-6">
        <LanguageSwitcher compact />
      </div>
      <div className="w-full max-w-md rounded-2xl border border-soft-border bg-surface-soft p-8 shadow-[var(--shadow-soft)]">
        <div className="space-y-3 text-center">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-accent">{t("signup.verifyEyebrow")}</p>
          <h1 className="font-display text-3xl text-foreground">{t("signup.verifyTitle")}</h1>
          <p className="text-sm leading-6 text-slate-600">
            {t("signup.verifySubtitle")} <span className="font-medium text-foreground">{email}</span>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <label className="block space-y-2">
            <span className="text-xs font-medium uppercase tracking-wide text-slate-500">{t("signup.otpLabel")}</span>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              required
              autoComplete="one-time-code"
              value={code}
              onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
              className="w-full rounded-xl border border-soft-border bg-white px-4 py-3 text-center text-2xl tracking-[0.5em] text-foreground outline-none transition focus:border-accent/50 focus:ring-2 focus:ring-accent/10"
              placeholder="------"
            />
          </label>

          {error ? (
            <p className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>
          ) : null}

          <button
            type="submit"
            disabled={loading || code.length !== 6}
            className="w-full rounded-full bg-accent px-4 py-3 text-sm font-semibold text-white transition hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? t("signup.verifying") : t("signup.verifyButton")}
          </button>
        </form>

        <div className="mt-6 space-y-3 text-center">
          <button
            type="button"
            onClick={handleResend}
            disabled={cooldown > 0}
            className="text-sm text-accent transition hover:text-accent-strong disabled:cursor-not-allowed disabled:text-slate-400"
          >
            {cooldown > 0 ? `${t("signup.resendIn")} ${cooldown}s` : t("signup.resend")}
          </button>
          <div>
            <Link href="/signup" className="inline-flex text-sm text-slate-500 transition hover:text-foreground">
              {t("signup.backToSignup")}
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function VerifyPage() {
  return (
    <Suspense>
      <VerifyForm />
    </Suspense>
  );
}
