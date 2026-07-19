"use client";

import { useI18n } from "@/components/i18n/I18nProvider";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";
import { useAuth } from "@/components/auth/AuthProvider";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export default function LoginPage() {
  const { t } = useI18n();
  const router = useRouter();
  const { refresh } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        setError(t("login.errCredentials"));
        setLoading(false);
        return;
      }

      await refresh();
      router.replace("/dashboard");
      router.refresh();
    } catch {
      setError(t("login.errConfig"));
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
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-accent">{t("login.eyebrow")}</p>
          <h1 className="font-display text-3xl text-foreground">{t("login.title")}</h1>
          <p className="text-sm leading-6 text-slate-600">{t("login.subtitle")}</p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <label className="block space-y-2">
            <span className="text-xs font-medium uppercase tracking-wide text-slate-500">{t("login.email")}</span>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-xl border border-soft-border bg-white px-4 py-3 text-sm text-foreground outline-none transition focus:border-accent/50 focus:ring-2 focus:ring-accent/10"
              placeholder={t("login.placeholderEmail")}
            />
          </label>

          <label className="block space-y-2">
            <span className="text-xs font-medium uppercase tracking-wide text-slate-500">{t("login.password")}</span>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-xl border border-soft-border bg-white px-4 py-3 text-sm text-foreground outline-none transition focus:border-accent/50 focus:ring-2 focus:ring-accent/10"
              placeholder={t("login.placeholderPassword")}
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
            {loading ? t("common.loggingIn") : t("common.login")}
          </button>
        </form>

        <div className="mt-6 space-y-3 text-center">
          <p className="text-sm text-slate-500">
            {t("login.noAccount")}{" "}
            <Link href="/demo" className="text-accent transition hover:text-accent-strong">
              {t("login.contactTeam")}
            </Link>
          </p>
          <Link href="/" className="inline-flex text-sm text-slate-500 transition hover:text-foreground">
            {t("login.backHome")}
          </Link>
        </div>
      </div>
    </main>
  );
}
