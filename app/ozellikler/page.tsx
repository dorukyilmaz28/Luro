"use client";

import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { useI18n } from "@/components/i18n/I18nProvider";
import Image from "next/image";
import { useEffect } from "react";

export default function OzelliklerPage() {
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

  const liveCapabilities = [
    { title: t("features.live1Title"), desc: t("features.live1Desc") },
    { title: t("features.live2Title"), desc: t("features.live2Desc") },
    { title: t("features.live3Title"), desc: t("features.live3Desc") },
    { title: t("features.live4Title"), desc: t("features.live4Desc") },
    { title: t("features.live5Title"), desc: t("features.live5Desc") },
    { title: t("features.live6Title"), desc: t("features.live6Desc") },
    { title: t("features.live7Title"), desc: t("features.live7Desc") },
    { title: t("features.live8Title"), desc: t("features.live8Desc") },
    { title: t("features.live9Title"), desc: t("features.live9Desc") },
  ];

  const roadmapCapabilities = [
    { title: t("features.roadmap1Title"), desc: t("features.roadmap1Desc") },
    { title: t("features.roadmap2Title"), desc: t("features.roadmap2Desc") },
    { title: t("features.roadmap3Title"), desc: t("features.roadmap3Desc") },
    { title: t("features.roadmap4Title"), desc: t("features.roadmap4Desc") },
  ];

  return (
    <div className="bg-background text-foreground">
      <MarketingHeader
        variant="compact"
        compactLinks={[
          { label: t("features.compactHome"), href: "/" },
          { label: t("nav.solution"), href: "/cozum" },
          { label: t("home.ctaDemo"), href: "/demo", primary: true },
        ]}
      />

      <main>
        <section className="border-b border-soft-border bg-grid-soft">
          <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 md:px-10 md:py-24">
            <div className="reveal-up max-w-3xl space-y-5">
              <p className="inline-flex rounded-full border border-soft-border bg-surface-soft px-3 py-1 text-xs tracking-wide text-slate-500">
                {t("features.badge")}
              </p>
              <h1 className="font-display text-[1.75rem] leading-tight sm:text-4xl md:text-6xl">
                {t("features.heroTitle")}
              </h1>
              <p className="text-base leading-8 text-slate-600 md:text-lg">{t("features.heroBody")}</p>
            </div>
          </div>
        </section>

        <section className="border-b border-soft-border bg-background">
          <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 md:px-10 md:py-24">
            <div className="reveal-up mb-10 max-w-2xl space-y-4">
              <div className="flex items-center gap-2">
                <span className="pulse-live h-2 w-2 rounded-full bg-accent" aria-hidden />
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-accent">
                  {t("features.liveEyebrow")}
                </p>
              </div>
              <h2 className="font-display text-3xl md:text-4xl">{t("features.liveTitle")}</h2>
              <p className="text-base leading-8 text-slate-600">{t("features.liveIntro")}</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {liveCapabilities.map((item, index) => (
                <article
                  key={item.title}
                  className="reveal-up rounded-2xl border border-soft-border bg-surface-soft p-6"
                  style={{ animationDelay: `${0.04 * index}s` }}
                >
                  <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-accent/10 px-2.5 py-1 text-[11px] font-medium text-accent">
                    <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                    {t("features.liveEyebrow")}
                  </div>
                  <h3 className="text-lg font-medium tracking-tight text-foreground">{item.title}</h3>
                  <p className="mt-2 text-sm leading-7 text-slate-600">{item.desc}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="border-b border-soft-border bg-surface-soft">
          <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 md:px-10 md:py-24">
            <div className="reveal-up mb-10 max-w-2xl space-y-4">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                {t("features.roadmapEyebrow")}
              </p>
              <h2 className="font-display text-3xl md:text-4xl">{t("features.roadmapTitle")}</h2>
              <p className="text-base leading-8 text-slate-600">{t("features.roadmapIntro")}</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {roadmapCapabilities.map((item, index) => (
                <article
                  key={item.title}
                  className="reveal-up rounded-2xl border border-dashed border-soft-border bg-background p-6"
                  style={{ animationDelay: `${0.05 * index}s` }}
                >
                  <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600">
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                    {t("features.roadmapEyebrow")}
                  </div>
                  <h3 className="text-lg font-medium tracking-tight text-foreground">{item.title}</h3>
                  <p className="mt-2 text-sm leading-7 text-slate-600">{item.desc}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="border-b border-soft-border bg-background">
          <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 md:px-10 md:py-24">
            <article className="reveal-up rounded-2xl border border-soft-border bg-surface-soft p-7 md:p-10">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-accent">
                {t("features.techEyebrow")}
              </p>
              <h2 className="font-display mt-3 text-2xl md:text-3xl">{t("features.techTitle")}</h2>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600 md:text-base md:leading-8">
                {t("features.techBody")}
              </p>
            </article>
          </div>
        </section>

        <section id="iletisim" className="bg-surface-soft">
          <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 md:px-10 md:py-24">
            <div className="reveal-up flex flex-col items-center gap-6 rounded-3xl border border-soft-border bg-background p-6 text-center shadow-[var(--shadow-soft)] sm:p-10 md:p-14">
              <Image
                src="/logo-dark.png"
                alt={t("home.logoAlt")}
                width={56}
                height={56}
                className="rounded-2xl"
              />
              <div className="space-y-4">
                <h2 className="font-display max-w-3xl text-3xl text-foreground md:text-5xl">
                  {t("features.ctaTitle")}
                </h2>
                <p className="mx-auto max-w-2xl text-base leading-8 text-slate-600">{t("features.ctaBody")}</p>
              </div>
              <div className="flex flex-wrap justify-center gap-4">
                <a
                  href="/demo"
                  className="rounded-full bg-accent px-6 py-3 text-sm font-medium text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-accent-strong hover:shadow-[0_10px_24px_rgba(47,111,176,0.3)]"
                >
                  {t("features.ctaDemo")}
                </a>
                <a
                  href="/demo#iletisim-form"
                  className="rounded-full border border-soft-border px-6 py-3 text-sm font-medium text-foreground transition-all duration-200 hover:-translate-y-0.5 hover:border-accent"
                >
                  {t("features.ctaContact")}
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
