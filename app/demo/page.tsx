"use client";

import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { marketingNavItems } from "@/components/marketing/nav";
import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";

export default function DemoPage() {
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
      { threshold: 0.12, rootMargin: "0px 0px -6% 0px" }
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
        setError(json.error || "Gönderim başarısız oldu.");
        return;
      }

      setSubmitted(true);
      form.reset();
    } catch {
      setError("Bağlantı hatası. İnternetinizi kontrol edip tekrar deneyin.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF5EF] text-slate-900">
      <MarketingHeader variant="landing" navItems={marketingNavItems} ctaHref="/demo" ctaLabel="Demo Formu" />

      <main>
        <section className="border-b border-soft-border bg-grid-soft">
          <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 md:px-10 md:py-24">
            <div className="reveal-up max-w-3xl space-y-5">
              <p className="inline-flex rounded-full border border-soft-border bg-surface-soft px-3 py-1 text-xs tracking-wide text-slate-500">
                Demo ve İletişim
              </p>
              <h1 className="text-[1.75rem] font-medium leading-tight tracking-tight sm:text-4xl md:text-6xl">
                Luro için demo talebinizi iletin.
              </h1>
              <p className="text-base leading-8 text-slate-600 md:text-lg">
                Kısa formu doldurun; operasyonunuza uygun kullanım senaryoları, entegrasyon yaklaşımı ve
                örnek akış üzerinden sizinle iletişime geçelim.
              </p>
            </div>
          </div>
        </section>

        <section id="iletisim-form" className="py-16 md:py-24">
          <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 sm:px-6 md:grid-cols-[1fr_1.1fr] md:px-10">
            <div className="reveal-up rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_10px_24px_rgba(15,23,42,0.05)] sm:p-7">
              <h2 className="text-2xl font-medium tracking-tight">Nasıl ilerliyoruz?</h2>
              <ul className="mt-5 space-y-3 text-sm leading-7 text-slate-600">
                <li>İhtiyaç ve saha tipinizi birlikte netleştiriyoruz.</li>
                <li>Mevcut kamera altyapınıza göre hızlı bir demo akışı kurguluyoruz.</li>
                <li>Öncelikli risk senaryoları için örnek tespit ve bildirim modelini paylaşıyoruz.</li>
              </ul>
              <p className="mt-6 text-sm text-slate-600">
                Doğrudan e-posta:{" "}
                <a href="mailto:hello@luro-ai.com" className="font-medium text-slate-800">
                  hello@luro-ai.com
                </a>
              </p>
            </div>

            <form
              onSubmit={handleSubmit}
              className="reveal-up rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_10px_24px_rgba(15,23,42,0.05)] sm:p-7 md:p-8"
              style={{ animationDelay: "0.08s" }}
            >
              <h2 className="text-2xl font-medium tracking-tight">İletişim Formu</h2>
              <p className="mt-2 text-sm text-slate-600">Bilgilerinizi paylaşın, ekibimiz en kısa sürede dönüş yapsın.</p>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <label className="text-sm">
                  <span className="mb-2 block text-slate-700">Ad Soyad</span>
                  <input
                    name="adSoyad"
                    required
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-base outline-none transition focus:border-[#0b1f3a]/30 focus:ring-2 focus:ring-[#0b1f3a]/10 sm:text-sm"
                  />
                </label>
                <label className="text-sm">
                  <span className="mb-2 block text-slate-700">Şirket</span>
                  <input
                    name="sirket"
                    required
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-base outline-none transition focus:border-[#0b1f3a]/30 focus:ring-2 focus:ring-[#0b1f3a]/10 sm:text-sm"
                  />
                </label>
                <label className="text-sm">
                  <span className="mb-2 block text-slate-700">E-posta</span>
                  <input
                    type="email"
                    name="email"
                    required
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-base outline-none transition focus:border-[#0b1f3a]/30 focus:ring-2 focus:ring-[#0b1f3a]/10 sm:text-sm"
                  />
                </label>
                <label className="text-sm">
                  <span className="mb-2 block text-slate-700">Telefon (opsiyonel)</span>
                  <input
                    name="telefon"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-base outline-none transition focus:border-[#0b1f3a]/30 focus:ring-2 focus:ring-[#0b1f3a]/10 sm:text-sm"
                  />
                </label>
              </div>

              <label className="mt-4 block text-sm">
                <span className="mb-2 block text-slate-700">Kısa mesaj</span>
                <textarea
                  name="mesaj"
                  rows={5}
                  required
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-base outline-none transition focus:border-[#0b1f3a]/30 focus:ring-2 focus:ring-[#0b1f3a]/10 sm:text-sm"
                  placeholder="Saha tipi, kamera sayısı veya öncelikli risk senaryolarını paylaşabilirsiniz."
                />
              </label>

              <div className="mt-6 flex flex-wrap items-center gap-4">
                <button
                  type="submit"
                  disabled={sending}
                  className="rounded-xl bg-navy px-6 py-3 text-sm font-medium text-slate-50 transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#0f2a52] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {sending ? "Gönderiliyor…" : "Demo Talebi Gönder"}
                </button>
                <Link href="/" className="text-sm text-slate-600 underline-offset-4 hover:underline">
                  Ana sayfaya dön
                </Link>
              </div>

              {error && <p className="mt-4 text-sm text-red-700">{error}</p>}

              {submitted && !error && (
                <p className="mt-4 text-sm text-emerald-700">
                  Talebiniz alındı. En kısa sürede sizinle iletişime geçeceğiz.
                </p>
              )}
            </form>
          </div>
        </section>
      </main>
      <MarketingFooter />
    </div>
  );
}
