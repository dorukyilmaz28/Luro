"use client";

import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { useI18n } from "@/components/i18n/I18nProvider";
import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";

export default function DemoPage() {
  const { t } = useI18n();
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const items = document.querySelectorAll(".reveal-up");
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -6% 0px" },
    );

    items.forEach((item) => observer.observe(item));
    return () => observer.disconnect();
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const payload = {
      adSoyad: String(data.get("adSoyad") || ""),
      sirket: String(data.get("sirket") || ""),
      email: String(data.get("email") || ""),
      telefon: String(data.get("telefon") || ""),
      mesaj: String(data.get("mesaj") || ""),
    };

    setSending(true);
    setError(null);
    setSubmitted(false);

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };

      if (!res.ok) {
        setError(json.error || t("demo.errSend"));
        return;
      }

      setSubmitted(true);
      form.reset();
    } catch {
      setError(t("demo.errNetwork"));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <MarketingHeader variant="compact" compactLinks={[{ label: t("nav.reviewSolution"), href: "/cozum" }]} />

      <main>
        <section className="border-b border-soft-border bg-grid-soft">
          <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 md:px-10 md:py-24">
            <div className="reveal-up max-w-3xl space-y-5">
              <p className="inline-flex rounded-full border border-soft-border bg-surface-soft px-3 py-1 text-xs tracking-wide text-slate-500">
                {t("demo.badge")}
              </p>
              <h1 className="font-display text-[1.75rem] leading-tight sm:text-4xl md:text-6xl">
                {t("demo.heroTitle")}
              </h1>
              <p className="text-base leading-8 text-slate-600 md:text-lg">{t("demo.heroBody")}</p>
            </div>
          </div>
        </section>

        <section id="iletisim-form" className="py-16 md:py-24">
          <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 sm:px-6 md:grid-cols-[1fr_1.1fr] md:px-10">
            <div className="reveal-up rounded-2xl border border-soft-border bg-white p-5 shadow-[var(--shadow-soft)] sm:p-7">
              <h2 className="font-display text-2xl">{t("demo.howTitle")}</h2>
              <ul className="mt-5 space-y-3 text-sm leading-7 text-slate-600">
                <li>{t("demo.howLi1")}</li>
                <li>{t("demo.howLi2")}</li>
                <li>{t("demo.howLi3")}</li>
              </ul>
              <p className="mt-6 text-sm text-slate-600">
                {t("demo.emailDirect")}{" "}
                <a href="mailto:luroai.tech@gmail.com" className="font-medium text-accent">
                  luroai.tech@gmail.com
                </a>
              </p>
            </div>

            <form
              onSubmit={handleSubmit}
              className="reveal-up rounded-2xl border border-soft-border bg-white p-5 shadow-[var(--shadow-soft)] sm:p-7 md:p-8"
              style={{ animationDelay: "0.08s" }}
            >
              <h2 className="font-display text-2xl">{t("demo.formTitle")}</h2>
              <p className="mt-2 text-sm text-slate-600">{t("demo.formSubtitle")}</p>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <label className="text-sm">
                  <span className="mb-2 block text-slate-700">{t("demo.name")}</span>
                  <input
                    name="adSoyad"
                    required
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-base outline-none transition focus:border-accent/40 focus:ring-2 focus:ring-accent/10 sm:text-sm"
                  />
                </label>
                <label className="text-sm">
                  <span className="mb-2 block text-slate-700">{t("demo.company")}</span>
                  <input
                    name="sirket"
                    required
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-base outline-none transition focus:border-accent/40 focus:ring-2 focus:ring-accent/10 sm:text-sm"
                  />
                </label>
                <label className="text-sm">
                  <span className="mb-2 block text-slate-700">{t("demo.email")}</span>
                  <input
                    type="email"
                    name="email"
                    required
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-base outline-none transition focus:border-accent/40 focus:ring-2 focus:ring-accent/10 sm:text-sm"
                  />
                </label>
                <label className="text-sm">
                  <span className="mb-2 block text-slate-700">{t("demo.phone")}</span>
                  <input
                    name="telefon"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-base outline-none transition focus:border-accent/40 focus:ring-2 focus:ring-accent/10 sm:text-sm"
                  />
                </label>
              </div>

              <label className="mt-4 block text-sm">
                <span className="mb-2 block text-slate-700">{t("demo.message")}</span>
                <textarea
                  name="mesaj"
                  rows={5}
                  required
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-base outline-none transition focus:border-accent/40 focus:ring-2 focus:ring-accent/10 sm:text-sm"
                  placeholder={t("demo.messagePlaceholder")}
                />
              </label>

              <div className="mt-6 flex flex-wrap items-center gap-4">
                <button
                  type="submit"
                  disabled={sending}
                  className="rounded-full bg-accent px-6 py-3 text-sm font-medium text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {sending ? t("demo.sending") : t("demo.submit")}
                </button>
                <Link href="/" className="text-sm text-slate-600 underline-offset-4 hover:underline">
                  {t("demo.backHome")}
                </Link>
              </div>

              {error && <p className="mt-4 text-sm text-red-700">{error}</p>}

              {submitted && !error && <p className="mt-4 text-sm text-emerald-700">{t("demo.success")}</p>}
            </form>
          </div>
        </section>
      </main>
    </div>
  );
}
