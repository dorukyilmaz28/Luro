"use client";

import { useI18n } from "@/components/i18n/I18nProvider";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export default function ForgotPasswordPage() {
  const { t } = useI18n();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/password/forgot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = (await res.json()) as { error?: string };

      if (!res.ok) {
        setError(data.error || t("forgotPassword.errGeneric"));
        setLoading(false);
        return;
      }

      router.push(`/reset-password?email=${encodeURIComponent(email)}`);
    } catch {
      setError(t("forgotPassword.errGeneric"));
      setLoading(false);
    }
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center bg-grid-soft px-4 py-12 text-foreground sm:px-6">
      <div className="absolute right-4 top-4 sm:right-6 sm:top-6">
        <LanguageSwitcher compact />
      </div>
      <div className="w-full max-w-md rounded-2xl border border-soft-border bg-surface-soft p-8 shadow-[var(--shadow-soft)]">
        <div className="space-y-3 text-center">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-accent">{t("forgotPassword.eyebrow")}</p>
          <h1 className="font-display text-3xl text-foreground">{t("forgotPassword.title")}</h1>
          <p className="text-sm leading-6 text-slate-600">{t("forgotPassword.subtitle")}</p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <label className="block space-y-2">
            <span className="text-xs font-medium uppercase tracking-wide text-slate-500">{t("forgotPassword.email")}</span>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-xl border border-soft-border bg-white px-4 py-3 text-sm text-foreground outline-none transition focus:border-accent/50 focus:ring-2 focus:ring-accent/10"
              placeholder="ornek@firma.com"
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
            {loading ? t("forgotPassword.sending") : t("forgotPassword.submit")}
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link href="/login" className="inline-flex text-sm text-slate-500 transition hover:text-foreground">
            {t("forgotPassword.backToLogin")}
          </Link>
        </div>
      </div>
    </main>
  );
}
