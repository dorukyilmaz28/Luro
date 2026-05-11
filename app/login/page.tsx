"use client";

import { useI18n } from "@/components/i18n/I18nProvider";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const { t } = useI18n();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = useMemo(() => {
    try {
      return createClient();
    } catch {
      return null;
    }
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase) {
      setError(t("login.errConfig"));
      return;
    }

    setLoading(true);
    setError(null);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError(t("login.errCredentials"));
      setLoading(false);
      return;
    }

    router.replace("/dashboard");
    router.refresh();
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center bg-[#081427] px-4 py-12 text-slate-100 sm:px-6">
      <div className="absolute right-4 top-4 sm:right-6 sm:top-6">
        <LanguageSwitcher compact className="border-white/15 bg-[#0f1f38]/80" />
      </div>
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0f1f38] p-8 shadow-[0_30px_60px_rgba(0,0,0,0.35)]">
        <div className="space-y-3 text-center">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-[#d4a64a]">{t("login.eyebrow")}</p>
          <h1 className="text-3xl font-medium tracking-tight">{t("login.title")}</h1>
          <p className="text-sm leading-6 text-slate-300">{t("login.subtitle")}</p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <label className="block space-y-2">
            <span className="text-xs font-medium uppercase tracking-wide text-slate-300">{t("login.email")}</span>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-xl border border-white/15 bg-[#0a1930] px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-[#d4a64a]/60"
              placeholder={t("login.placeholderEmail")}
            />
          </label>

          <label className="block space-y-2">
            <span className="text-xs font-medium uppercase tracking-wide text-slate-300">{t("login.password")}</span>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-xl border border-white/15 bg-[#0a1930] px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-[#d4a64a]/60"
              placeholder={t("login.placeholderPassword")}
            />
          </label>

          {error ? (
            <p className="rounded-lg border border-rose-400/40 bg-rose-900/20 px-3 py-2 text-sm text-rose-200">{error}</p>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-[#d4a64a] px-4 py-3 text-sm font-semibold text-[#17253b] transition hover:bg-[#e0b35b] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? t("common.loggingIn") : t("common.login")}
          </button>
        </form>

        <div className="mt-6 space-y-3 text-center">
          <p className="text-sm text-slate-400">
            {t("login.noAccount")}{" "}
            <Link href="/demo" className="text-[#d4a64a] transition hover:text-[#f0c872]">
              {t("login.contactTeam")}
            </Link>
          </p>
          <Link href="/" className="inline-flex text-sm text-slate-400 transition hover:text-slate-200">
            {t("login.backHome")}
          </Link>
        </div>
      </div>
    </main>
  );
}
