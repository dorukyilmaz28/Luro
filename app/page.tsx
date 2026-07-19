"use client";

import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { useI18n } from "@/components/i18n/I18nProvider";
import Image from "next/image";
import { useEffect } from "react";

export default function Home() {
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
      { threshold: 0.14, rootMargin: "0px 0px -6% 0px" }
    );

    items.forEach((item) => observer.observe(item));
    return () => observer.disconnect();
  }, []);

  const navItems = [
    { label: t("nav.solution"), href: "/cozum" },
    { label: t("nav.features"), href: "/ozellikler" },
    { label: t("nav.useCases"), href: "#kullanim-alanlari" },
    { label: t("nav.founders"), href: "#kurucular" },
    { label: t("nav.contact"), href: "#iletisim" },
  ];

  const founders = [
    {
      name: "Doruk Yılmaz",
      title: t("home.founderRolePartner"),
      linkedin:
        process.env.NEXT_PUBLIC_LINKEDIN_DORUK ||
        "https://www.linkedin.com/in/doruk-y%C4%B1lmaz-4ba85833b/",
    },
    {
      name: "Demir Sanğu",
      title: t("home.founderRolePartner"),
      linkedin:
        process.env.NEXT_PUBLIC_LINKEDIN_DEMIR ||
        "https://www.linkedin.com/in/demir-san%C4%9Fu-8370a0404/",
    },
    {
      name: "Mina Tuncel",
      title: t("home.founderRolePr"),
      linkedin: "https://www.linkedin.com/in/mina-tuncel-8aa016365/",
    },
  ];

  const featureItems = [
    {
      icon: "ppe",
      title: t("home.featPpeTitle"),
      description: t("home.featPpeDesc"),
    },
    {
      icon: "zone",
      title: t("home.featZoneTitle"),
      description: t("home.featZoneDesc"),
    },
    {
      icon: "proximity",
      title: t("home.featProxTitle"),
      description: t("home.featProxDesc"),
    },
    {
      icon: "alert",
      title: t("home.featAlertTitle"),
      description: t("home.featAlertDesc"),
    },
    {
      icon: "report",
      title: t("home.featReportTitle"),
      description: t("home.featReportDesc"),
    },
  ];

  const useCases = [t("home.useConstruction"), t("home.useWarehouse"), t("home.useLogistics"), t("home.useIndustrial")];

  const trustStats = [
    { label: t("home.statAccuracy"), value: "%90+" },
    { label: t("home.statLatency"), value: "< 3 sn" },
    { label: t("home.statCompliance"), value: "%97+" },
  ];

  const trustPillars = [t("home.pillar1"), t("home.pillar2"), t("home.pillar3")];

  const renderFeatureIcon = (icon: string) => {
    if (icon === "ppe") {
      return (
        <svg viewBox="0 0 24 24" className="h-5 w-5 text-accent" fill="none" stroke="currentColor" strokeWidth="1.7">
          <path d="M4 13.5h16v5a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18.5v-5Z" />
          <path d="M7 13.5V11a5 5 0 0 1 10 0v2.5" />
          <path d="M10 8.8h4" />
        </svg>
      );
    }
    if (icon === "zone") {
      return (
        <svg viewBox="0 0 24 24" className="h-5 w-5 text-accent" fill="none" stroke="currentColor" strokeWidth="1.7">
          <rect x="4" y="4" width="16" height="16" rx="2.5" />
          <path d="M8 8h8v8H8z" strokeDasharray="2 2" />
          <path d="M16.5 7.5 7.5 16.5" />
        </svg>
      );
    }
    if (icon === "proximity") {
      return (
        <svg viewBox="0 0 24 24" className="h-5 w-5 text-accent" fill="none" stroke="currentColor" strokeWidth="1.7">
          <circle cx="7.5" cy="12" r="2.5" />
          <rect x="14" y="9" width="5" height="6" rx="1.5" />
          <path d="M10.5 12h2.5" />
          <path d="M12.5 8.7a4 4 0 0 1 0 6.6" />
        </svg>
      );
    }
    if (icon === "alert") {
      return (
        <svg viewBox="0 0 24 24" className="h-5 w-5 text-accent" fill="none" stroke="currentColor" strokeWidth="1.7">
          <path d="M12 4.5 20 18H4L12 4.5Z" />
          <path d="M12 9v4.2" />
          <circle cx="12" cy="15.8" r="0.9" fill="currentColor" stroke="none" />
        </svg>
      );
    }
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5 text-accent" fill="none" stroke="currentColor" strokeWidth="1.7">
        <rect x="4" y="4" width="16" height="16" rx="2.5" />
        <path d="M8 9.5h8M8 12h8M8 14.5h5" />
      </svg>
    );
  };

  return (
    <div className="bg-background text-foreground">
      <MarketingHeader variant="landing" navItems={navItems} />

      <main>
        <section id="cozum" className="border-b border-soft-border bg-grid-soft">
          <div className="mx-auto w-full max-w-6xl px-4 pb-14 pt-14 sm:px-6 md:px-10 md:pb-24 md:pt-24">
            <div className="reveal-up mx-auto max-w-3xl space-y-7 text-center">
              <p className="inline-flex rounded-full border border-soft-border bg-surface-soft px-3 py-1 text-xs tracking-wide text-slate-500">
                {t("home.badge")}
              </p>
              <div className="space-y-5">
                <h1 className="font-display mx-auto max-w-3xl text-[1.75rem] leading-tight text-foreground sm:text-4xl md:text-6xl">
                  {t("home.heroTitle")}
                </h1>
                <p className="mx-auto max-w-2xl text-base leading-8 text-muted md:text-lg">{t("home.heroBody")}</p>
              </div>
              <div className="flex flex-wrap justify-center gap-4">
                <a
                  href="/demo"
                  className="rounded-full bg-accent px-6 py-3 text-sm font-medium text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-accent-strong hover:shadow-[0_10px_24px_rgba(47,111,176,0.3)]"
                >
                  {t("home.ctaDemo")}
                </a>
                <a
                  href="/cozum"
                  className="rounded-full border border-soft-border bg-white px-6 py-3 text-sm font-medium text-slate-700 transition-all duration-200 hover:-translate-y-0.5 hover:border-accent"
                >
                  {t("home.ctaMore")}
                </a>
              </div>
            </div>
            <div className="reveal-up mt-14 grid gap-4 md:mt-16 md:grid-cols-3" style={{ animationDelay: "0.08s" }}>
              {trustStats.map((stat) => (
                <div key={stat.label} className="rounded-2xl border border-soft-border bg-surface-soft p-6 text-left">
                  <p className="font-display text-3xl text-accent">{stat.value}</p>
                  <p className="mt-2 text-sm text-slate-600">{stat.label}</p>
                </div>
              ))}
            </div>
            <div className="reveal-up mt-6 flex flex-wrap items-center justify-center gap-3" style={{ animationDelay: "0.12s" }}>
              {trustPillars.map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-soft-border bg-white px-5 py-2.5 text-sm text-slate-600"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
        </section>

        <section className="border-b border-soft-border bg-surface-soft">
          <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-16 sm:px-6 md:px-10 md:py-20 lg:grid-cols-[1.1fr_0.9fr]">
            <div
              className="reveal-up bg-noise-soft overflow-hidden rounded-3xl border border-soft-border bg-white p-6 shadow-[var(--shadow-soft)] md:p-8"
              style={{ animationDelay: "0.1s" }}
            >
              <div className="mb-6 flex items-center justify-between border-b border-soft-border pb-4">
                <div>
                  <p className="text-sm text-slate-500">{t("home.liveMonitor")}</p>
                  <h2 className="text-lg font-medium text-slate-900">{t("home.opsSummary")}</h2>
                </div>
                <span className="rounded-full border border-accent/35 bg-accent/10 px-3 py-1 text-xs font-medium text-accent">
                  <span className="pulse-live mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-accent align-middle" />
                  {t("home.active")}
                </span>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-soft-border bg-slate-50 p-4">
                  <p className="text-xs text-slate-500">{t("home.camA")}</p>
                  <svg viewBox="0 0 320 170" className="mt-3 h-auto w-full rounded-lg border border-soft-border bg-white">
                    <rect x="1" y="1" width="318" height="168" rx="10" fill="#F8FAFC" stroke="rgba(28,39,51,0.08)" />
                    <rect x="18" y="26" width="128" height="98" rx="8" fill="#E2E8F0" />
                    <rect x="162" y="40" width="138" height="84" rx="8" fill="#CBD5E1" />
                    <rect x="96" y="20" width="62" height="114" rx="8" fill="none" stroke="#2F6FB0" strokeWidth="2" />
                    <circle cx="291" cy="24" r="5" fill="#16A34A" />
                    <text x="20" y="150" fill="#475569" fontSize="10">
                      {t("home.svgPpe")}
                    </text>
                  </svg>
                </div>
                <div className="rounded-xl border border-soft-border bg-slate-50 p-4">
                  <p className="text-xs text-slate-500">{t("home.camB")}</p>
                  <svg viewBox="0 0 320 170" className="mt-3 h-auto w-full rounded-lg border border-soft-border bg-white">
                    <rect x="1" y="1" width="318" height="168" rx="10" fill="#F8FAFC" stroke="rgba(28,39,51,0.08)" />
                    <rect x="20" y="24" width="280" height="20" rx="6" fill="#E2E8F0" />
                    <rect x="20" y="55" width="280" height="74" rx="8" fill="#CBD5E1" />
                    <rect x="214" y="64" width="68" height="54" rx="8" fill="none" stroke="#C1554C" strokeWidth="2" />
                    <rect x="20" y="138" width="94" height="14" rx="4" fill="#1E293B" opacity="0.12" />
                    <text x="125" y="149" fill="#475569" fontSize="10">
                      {t("home.svgZone")}
                    </text>
                  </svg>
                </div>
              </div>
              <div className="mt-4 space-y-3 rounded-xl border border-soft-border p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  {t("home.alertList")}
                </p>
                {[t("home.alert1"), t("home.alert2"), t("home.alert3")].map((alert) => (
                  <div
                    key={alert}
                    className="flex flex-col gap-2 rounded-lg border border-soft-border bg-slate-50 px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <span className="break-words text-sm text-slate-700">{alert}</span>
                    <span className="blink-alert h-2 w-2 shrink-0 self-start rounded-full bg-danger sm:self-center" />
                  </div>
                ))}
              </div>
              <div className="mt-4 rounded-xl border border-soft-border bg-slate-50 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  {t("home.eventLog")}
                </p>
                <div className="mt-3 space-y-2 text-sm text-slate-600">
                  <p>{t("home.log1")}</p>
                  <p>{t("home.log2")}</p>
                  <p>{t("home.log3")}</p>
                </div>
              </div>
            </div>
            <div className="reveal-up space-y-6 self-center" style={{ animationDelay: "0.16s" }}>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-accent">{t("home.liveProductEyebrow")}</p>
              <h2 className="font-display text-3xl text-foreground md:text-4xl">
                {t("home.liveProductTitle")}
              </h2>
              <p className="text-base leading-8 text-slate-600">{t("home.liveProductBody")}</p>
              <div className="rounded-2xl border border-soft-border bg-slate-50 p-5">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500">{t("home.trustSignals")}</p>
                <div className="mt-3 space-y-2">
                  {[t("home.trust1"), t("home.trust2"), t("home.trust3")].map((item) => (
                    <p key={item} className="text-sm text-slate-700">
                      {item}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-soft-border bg-background">
          <div className="mx-auto grid w-full max-w-6xl gap-12 px-4 py-16 sm:px-6 md:px-10 md:py-24 lg:grid-cols-[1.05fr_1fr]">
            <div className="reveal-up space-y-4">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-accent">
                {t("home.whyEyebrow")}
              </p>
              <h2 className="font-display max-w-xl text-3xl text-foreground md:text-4xl">
                {t("home.whyTitle")}
              </h2>
            </div>
            <div
              className="reveal-up space-y-5 text-base leading-8 text-slate-600"
              style={{ animationDelay: "0.08s" }}
            >
              <p>{t("home.whyP1")}</p>
              <p>{t("home.whyP2")}</p>
              <p className="font-medium text-slate-800">{t("home.whyP3")}</p>
            </div>
          </div>
        </section>

        <section id="ozellikler" className="border-b border-soft-border bg-background">
          <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 md:px-10 md:py-24">
            <div className="reveal-up mb-12 flex max-w-2xl flex-col gap-4 sm:flex-row sm:items-end sm:justify-between sm:max-w-none">
              <div className="max-w-2xl space-y-4">
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-accent">
                  {t("home.featuresEyebrow")}
                </p>
                <h2 className="font-display text-3xl text-foreground md:text-4xl">
                  {t("home.featuresTitle")}
                </h2>
              </div>
              <a
                href="/ozellikler"
                className="inline-flex shrink-0 items-center gap-1.5 text-sm font-medium text-accent transition-colors hover:text-accent-strong"
              >
                {t("nav.features")}
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 6l6 6-6 6" />
                </svg>
              </a>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {featureItems.map((feature, index) => (
                <article
                  key={feature.title}
                  className="reveal-up rounded-2xl border border-soft-border bg-surface-soft p-6 transition-transform duration-200 hover:-translate-y-0.5"
                  style={{ animationDelay: `${0.05 * index}s` }}
                >
                  <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-accent/30 bg-accent/10">
                    {renderFeatureIcon(feature.icon)}
                  </div>
                  <h3 className="text-lg font-medium tracking-tight text-foreground">
                    {feature.title}
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-slate-600">{feature.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="kullanim-alanlari" className="border-b border-soft-border bg-background">
          <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-16 sm:px-6 md:px-10 md:py-24 lg:grid-cols-[1fr_1fr]">
            <div className="reveal-up space-y-4">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-accent">
                {t("home.useCasesEyebrow")}
              </p>
              <h2 className="font-display text-3xl text-foreground md:text-4xl">
                {t("home.useCasesTitle")}
              </h2>
              <p className="text-base leading-8 text-slate-600">{t("home.useCasesBody")}</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {useCases.map((item, index) => (
                <div
                  key={item}
                  className="reveal-up rounded-2xl border border-soft-border bg-white p-6"
                  style={{ animationDelay: `${0.08 * index}s` }}
                >
                  <p className="text-sm text-muted">{t("common.sector")}</p>
                  <h3 className="mt-2 text-xl font-medium tracking-tight text-slate-900">{item}</h3>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="kurucular" className="border-b border-soft-border bg-surface-soft">
          <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 md:px-10 md:py-24">
            <div className="reveal-up mb-12 max-w-2xl space-y-4">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-accent">
                {t("home.foundersEyebrow")}
              </p>
              <h2 className="font-display text-3xl text-foreground md:text-4xl">
                {t("home.foundersTitle")}
              </h2>
              <p className="text-base leading-8 text-slate-600">{t("home.foundersBody")}</p>
            </div>
            <div className="grid gap-6 sm:grid-cols-2">
              {founders.map((person, index) => (
                <article
                  key={person.name}
                  className="reveal-up flex flex-col rounded-2xl border border-soft-border bg-white p-8 shadow-[var(--shadow-soft)]"
                  style={{ animationDelay: `${0.06 * index}s` }}
                >
                  <h3 className="text-xl font-medium tracking-tight text-slate-900">{person.name}</h3>
                  <p className="mt-1 text-sm text-slate-600">{person.title}</p>
                  <a
                    href={person.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-6 inline-flex items-center gap-2 self-start rounded-xl border border-[#0A66C2]/25 bg-[#0A66C2]/[0.06] px-4 py-2.5 text-sm font-medium text-[#0A66C2] transition-colors duration-200 hover:border-[#0A66C2]/40 hover:bg-[#0A66C2]/10"
                  >
                    <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                    </svg>
                    {t("common.linkedinProfile")}
                  </a>
                </article>
              ))}
            </div>
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
                <p className="text-xs font-medium uppercase tracking-[0.2em] text-accent">
                  {t("home.ctaEyebrow")}
                </p>
                <h2 className="font-display max-w-3xl text-3xl text-foreground md:text-5xl">
                  {t("home.ctaTitle")}
                </h2>
                <p className="mx-auto max-w-2xl text-base leading-8 text-slate-600">{t("home.ctaBody")}</p>
              </div>
              <div className="flex flex-wrap justify-center gap-4">
                <a
                  href="/demo"
                  className="rounded-full bg-accent px-6 py-3 text-sm font-medium text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-accent-strong hover:shadow-[0_10px_24px_rgba(47,111,176,0.3)]"
                >
                  {t("home.ctaDemo")}
                </a>
                <a
                  href="/demo#iletisim-form"
                  className="rounded-full border border-soft-border px-6 py-3 text-sm font-medium text-foreground transition-all duration-200 hover:-translate-y-0.5 hover:border-accent"
                >
                  {t("home.ctaContact")}
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-soft-border bg-background">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-10 text-sm text-slate-600 sm:px-6 md:flex-row md:items-end md:justify-between md:px-10">
          <div className="space-y-2">
            <p className="text-base font-medium text-slate-900">Luro</p>
            <p className="max-w-md">{t("home.footerTagline")}</p>
          </div>
          <div className="space-y-2 text-left md:text-right">
            <a
              href="mailto:luroai.tech@gmail.com"
              className="block break-all transition-colors duration-200 hover:text-slate-900"
            >
              luroai.tech@gmail.com
            </a>
            <a
              href="https://www.linkedin.com/company/luroai-tech/"
              target="_blank"
              rel="noopener noreferrer"
              className="block transition-colors duration-200 hover:text-slate-900"
            >
              LinkedIn
            </a>
            <p className="text-xs text-slate-500">
              © {new Date().getFullYear()} Luro. {t("home.footerRights")}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
