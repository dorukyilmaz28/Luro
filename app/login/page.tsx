"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
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
      setError("Supabase ayarlari eksik. Lutfen ortam degiskenlerini kontrol edin.");
      return;
    }

    setLoading(true);
    setError(null);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError(signInError.message || "Giris yapilamadi.");
      setLoading(false);
      return;
    }

    router.replace("/dashboard");
    router.refresh();
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#081427] px-4 py-12 text-slate-100 sm:px-6">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0f1f38] p-8 shadow-[0_30px_60px_rgba(0,0,0,0.35)]">
        <div className="space-y-3 text-center">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-[#d4a64a]">Luro Console</p>
          <h1 className="text-3xl font-medium tracking-tight">Hesabiniza giris yapin</h1>
          <p className="text-sm leading-6 text-slate-300">
            Guvenlik dashboard'una ulasmak icin kurumsal e-posta hesabinizi kullanin.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <label className="block space-y-2">
            <span className="text-xs font-medium uppercase tracking-wide text-slate-300">E-posta</span>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-xl border border-white/15 bg-[#0a1930] px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-[#d4a64a]/60"
              placeholder="ornek@firma.com"
            />
          </label>

          <label className="block space-y-2">
            <span className="text-xs font-medium uppercase tracking-wide text-slate-300">Sifre</span>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-xl border border-white/15 bg-[#0a1930] px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-[#d4a64a]/60"
              placeholder="********"
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
            {loading ? "Giris yapiliyor..." : "Giris Yap"}
          </button>
        </form>

        <Link
          href="/"
          className="mt-6 inline-flex w-full justify-center text-sm text-slate-300 transition hover:text-slate-100"
        >
          Ana sayfaya don
        </Link>
      </div>
    </main>
  );
}
