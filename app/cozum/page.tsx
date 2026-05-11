"use client";

import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { useI18n } from "@/components/i18n/I18nProvider";
import Image from "next/image";
import { useEffect } from "react";

export default function CozumPage() {
  const { t } = useI18n();

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

  const steps = [
    { title: t("cozum.step1Title"), text: t("cozum.step1Text") },
    { title: t("cozum.step2Title"), text: t("cozum.step2Text") },
    { title: t("cozum.step3Title"), text: t("cozum.step3Text") },
    { title: t("cozum.step4Title"), text: t("cozum.step4Text") },
  ];

  const capabilities = [t("cozum.cap1"), t("cozum.cap2"), t("cozum.cap3"), t("cozum.cap4"), t("cozum.cap5")];

  const useAreas = [t("cozum.area1"), t("cozum.area2"), t("cozum.area3"), t("cozum.area4"), t("cozum.area5")];

  return (
    <div className="bg-[#FAF5EF] text-slate-900">
      <MarketingHeader
        variant="compact"
        compactLinks={[
          { label: t("cozum.compactHome"), href: "/" },
          { label: t("home.ctaDemo"), href: "/demo", primary: true },
        ]}
      />

      <main>
        <section className="border-b border-soft-border bg-grid-soft">
          <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 md:px-10 md:py-24">
            <div className="reveal-up max-w-3xl space-y-5">
              <p className="inline-flex rounded-full border border-soft-border bg-surface-soft px-3 py-1 text-xs tracking-wide text-slate-500">
                {t("cozum.badge")}
              </p>
              <h1 className="text-[1.75rem] font-medium leading-tight tracking-tight sm:text-4xl md:text-6xl">
                {t("cozum.heroTitle")}
              </h1>
              <p className="text-base leading-8 text-slate-600 md:text-lg">{t("cozum.heroBody")}</p>
            </div>
          </div>
        </section>

        <section className="border-b border-soft-border bg-[#FAF5EF]">
          <div className="mx-auto grid w-full max-w-6xl gap-10 px-6 py-18 md:px-10 md:py-24 lg:grid-cols-2">
            <article className="reveal-up rounded-2xl border border-soft-border bg-surface-soft p-7">
              <h2 className="text-2xl font-medium tracking-tight">{t("cozum.whatTitle")}</h2>
              <p className="mt-4 text-sm leading-7 text-slate-600">{t("cozum.whatBody")}</p>
            </article>
            <article
              className="reveal-up rounded-2xl border border-soft-border bg-surface-soft p-7"
              style={{ animationDelay: "0.08s" }}
            >
              <h2 className="text-2xl font-medium tracking-tight">{t("cozum.whyTitle")}</h2>
              <ul className="mt-4 space-y-2 text-sm leading-7 text-slate-600">
                <li>{t("cozum.whyLi1")}</li>
                <li>{t("cozum.whyLi2")}</li>
                <li>{t("cozum.whyLi3")}</li>
              </ul>
            </article>
          </div>
        </section>

        <section className="border-b border-soft-border bg-surface-soft">
          <div className="mx-auto w-full max-w-6xl px-6 py-18 md:px-10 md:py-24">
            <div className="reveal-up mb-10 max-w-2xl space-y-4">
              <h2 className="text-3xl font-medium tracking-tight md:text-4xl">{t("cozum.howTitle")}</h2>
              <p className="text-base leading-8 text-slate-600">{t("cozum.howBody")}</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {steps.map((step, index) => (
                <article
                  key={step.title}
                  className="reveal-up rounded-2xl border border-soft-border bg-white p-6"
                  style={{ animationDelay: `${0.06 * index}s` }}
                >
                  <p className="text-xs font-medium uppercase tracking-[0.16em] text-[#9a762f]">
                    {t("cozum.stepPrefix")} 0{index + 1}
                  </p>
                  <h3 className="mt-3 text-xl font-medium tracking-tight">{step.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-slate-600">{step.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="border-b border-soft-border bg-[#FAF5EF]">
          <div className="mx-auto grid w-full max-w-6xl gap-10 px-6 py-18 md:px-10 md:py-24 lg:grid-cols-2">
            <div className="reveal-up">
              <h2 className="text-3xl font-medium tracking-tight md:text-4xl">{t("cozum.capsTitle")}</h2>
              <ul className="mt-6 space-y-3 text-sm leading-7 text-slate-600">
                {capabilities.map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <span className="mt-2 h-1.5 w-1.5 rounded-full bg-[#d4a64a]" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="reveal-up" style={{ animationDelay: "0.08s" }}>
              <h2 className="text-3xl font-medium tracking-tight md:text-4xl">{t("cozum.areasTitle")}</h2>
              <ul className="mt-6 grid gap-3 text-sm leading-7 text-slate-600 sm:grid-cols-2">
                {useAreas.map((item) => (
                  <li key={item} className="rounded-xl border border-soft-border bg-surface-soft px-4 py-3">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className="border-b border-soft-border bg-surface-soft">
          <div className="mx-auto grid w-full max-w-6xl gap-10 px-6 py-18 md:px-10 md:py-24 lg:grid-cols-2">
            <article className="reveal-up rounded-2xl border border-soft-border bg-white p-7">
              <h2 className="text-2xl font-medium tracking-tight">{t("cozum.integTitle")}</h2>
              <p className="mt-4 text-sm leading-7 text-slate-600">{t("cozum.integBody")}</p>
            </article>
            <article
              className="reveal-up rounded-2xl border border-soft-border bg-white p-7"
              style={{ animationDelay: "0.08s" }}
            >
              <h2 className="text-2xl font-medium tracking-tight">{t("cozum.opsTitle")}</h2>
              <p className="mt-4 text-sm leading-7 text-slate-600">{t("cozum.opsBody")}</p>
            </article>
          </div>
        </section>

        <div
          aria-hidden
          className="h-20 bg-gradient-to-b from-[#FAF5EF] via-[#18355b] to-[#0b1f3a]"
        />

        <section id="iletisim" className="bg-navy">
          <div className="mx-auto w-full max-w-6xl px-6 py-18 md:px-10 md:py-24">
            <div className="reveal-up rounded-3xl border border-white/15 bg-white/[0.04] p-10 md:p-14">
              <Image
                src="/logo-gold.png"
                alt={t("home.logoAlt")}
                width={56}
                height={56}
                className="mb-5 rounded-2xl"
              />
              <h2 className="max-w-3xl text-3xl font-medium tracking-tight text-slate-50 md:text-5xl">
                {t("cozum.ctaTitle")}
              </h2>
              <p className="mt-5 max-w-2xl text-base leading-8 text-slate-300">{t("cozum.ctaBody")}</p>
              <div className="mt-8 flex flex-wrap gap-4">
                <a
                  href="/demo"
                  className="rounded-xl bg-[#d4a64a] px-6 py-3 text-sm font-medium text-[#1e2b3f] transition-colors duration-200 hover:bg-[#e1b558]"
                >
                  {t("cozum.ctaDemo")}
                </a>
                <a
                  href="/demo#iletisim-form"
                  className="rounded-xl border border-white/20 px-6 py-3 text-sm font-medium text-slate-100 transition-colors duration-200 hover:border-white/40 hover:bg-white/10"
                >
                  {t("cozum.ctaContact")}
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
