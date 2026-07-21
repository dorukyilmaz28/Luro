"use client";

import { useI18n } from "@/components/i18n/I18nProvider";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useState } from "react";

const RESEND_COOLDOWN_SECONDS = 60;

function ResetForm() {
  const { t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";

  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SECONDS);

  useEffect(() => {
    if (!email) router.replace("/forgot-password");
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
      const res = await fetch("/api/auth/password/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code, password }),
      });
      const data = (await res.json()) as { error?: string };

      if (!res.ok) {
        setError(data.error || t("resetPassword.errGeneric"));
        setLoading(false);
        return;
      }

      setDone(true);
    } catch {
      setError(t("resetPassword.errGeneric"));
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0) return;
    setError(null);
    try {
      const res = await fetch("/api/auth/password/forgot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error || t("resetPassword.errGeneric"));
        return;
      }
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } catch {
      setError(t("resetPassword.errGeneric"));
    }
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center bg-grid-soft px-4 py-12 text-foreground sm:px-6">
      <div className="absolute right-4 top-4 sm:right-6 sm:top-6">
        <LanguageSwitcher compact />
      </div>
      <div className="w-full max-w-md rounded-2xl border border-soft-border bg-surface-soft p-8 shadow-[var(--shadow-soft)]">
        {done ? (
          <div className="space-y-6 text-center">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-accent">{t("resetPassword.eyebrow")}</p>
            <p className="text-sm leading-6 text-slate-600">{t("resetPassword.success")}</p>
            <Link
              href="/login"
              className="inline-flex w-full items-center justify-center rounded-full bg-accent px-4 py-3 text-sm font-semibold text-white transition hover:bg-accent-strong"
            >
              {t("resetPassword.goToLogin")}
            </Link>
          </div>
        ) : (
          <>
            <div className="space-y-3 text-center">
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-accent">{t("resetPassword.eyebrow")}</p>
              <h1 className="font-display text-3xl text-foreground">{t("resetPassword.title")}</h1>
              <p className="text-sm leading-6 text-slate-600">
                {t("resetPassword.subtitle")} <span className="font-medium text-foreground">{email}</span>
              </p>
            </div>

            <form onSubmit={handleSubmit} className="mt-8 space-y-4">
              <label className="block space-y-2">
                <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  {t("resetPassword.otpLabel")}
                </span>
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

              <label className="block space-y-2">
                <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  {t("resetPassword.newPassword")}
                </span>
                <input
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full rounded-xl border border-soft-border bg-white px-4 py-3 text-sm text-foreground outline-none transition focus:border-accent/50 focus:ring-2 focus:ring-accent/10"
                  placeholder={t("resetPassword.placeholderPassword")}
                />
              </label>

              {error ? (
                <p className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>
              ) : null}

              <button
                type="submit"
                disabled={loading || code.length !== 6 || password.length < 8}
                className="w-full rounded-full bg-accent px-4 py-3 text-sm font-semibold text-white transition hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading ? t("resetPassword.saving") : t("resetPassword.submit")}
              </button>
            </form>

            <div className="mt-6 space-y-3 text-center">
              <button
                type="button"
                onClick={handleResend}
                disabled={cooldown > 0}
                className="text-sm text-accent transition hover:text-accent-strong disabled:cursor-not-allowed disabled:text-slate-400"
              >
                {cooldown > 0 ? `${t("resetPassword.resendIn")} ${cooldown}s` : t("resetPassword.resend")}
              </button>
              <div>
                <Link href="/login" className="inline-flex text-sm text-slate-500 transition hover:text-foreground">
                  {t("forgotPassword.backToLogin")}
                </Link>
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetForm />
    </Suspense>
  );
}
