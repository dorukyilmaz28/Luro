"use client";

import { BrandLogo } from "@/components/BrandLogo";
import Image from "next/image";
import { useEffect, useState } from "react";

export default function Home() {
  const [navOpen, setNavOpen] = useState(false);

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

  useEffect(() => {
    if (!navOpen) return;
    const onResize = () => {
      if (window.matchMedia("(min-width: 1024px)").matches) setNavOpen(false);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [navOpen]);

  const navItems = [
    { label: "Çözüm", href: "/cozum" },
    { label: "Özellikler", href: "#ozellikler" },
    { label: "Kullanım Alanları", href: "#kullanim-alanlari" },
    { label: "Kurucular", href: "#kurucular" },
    { label: "İletişim", href: "#iletisim" },
  ];

  const founders = [
    {
      name: "Doruk Yılmaz",
      title: "Kurucu Ortak",
      linkedin:
        process.env.NEXT_PUBLIC_LINKEDIN_DORUK ||
        "https://www.linkedin.com/in/doruk-y%C4%B1lmaz-4ba85833b/",
    },
    {
      name: "Demir Sanğu",
      title: "Kurucu Ortak",
      linkedin:
        process.env.NEXT_PUBLIC_LINKEDIN_DEMIR ||
        "https://www.linkedin.com/in/demir-san%C4%9Fu-8370a0404/",
    },
  ];

  const featureItems = [
    {
      icon: "ppe",
      title: "Kişisel koruyucu ekipman tespiti",
      description:
        "Baret, yelek ve benzeri PPE kullanımını sahadaki kamera akışları üzerinden sürekli doğrular.",
    },
    {
      icon: "zone",
      title: "Yasaklı alan ihlali tespiti",
      description:
        "Yetkisiz girişleri anlık olarak işaretler, kritik bölgelerde operasyon ekiplerini gecikmeden bilgilendirir.",
    },
    {
      icon: "proximity",
      title: "Yakınlık risk analizi",
      description:
        "Araç ve personel etkileşimini izleyerek çarpışmaya veya sıkışmaya açık senaryoları erken aşamada yakalar.",
    },
    {
      icon: "alert",
      title: "Gerçek zamanlı uyarılar",
      description:
        "Öncelik seviyesine göre sınıflanan bildirimlerle ekiplerin hızlı ve doğru aksiyon almasını kolaylaştırır.",
    },
    {
      icon: "report",
      title: "Olay kaydı ve raporlama paneli",
      description:
        "Tüm olayları zaman damgası ile kaydeder; denetim, iyileştirme ve yönetim raporlaması için net görünürlük sağlar.",
    },
  ];

  const useCases = [
    "İnşaat sahaları",
    "Depolar",
    "Lojistik merkezleri",
    "Endüstriyel operasyonlar",
  ];

  const trustStats = [
    { label: "Risk tespit doğruluğu", value: "%90+" },
    { label: "Ortalama uyarı gecikmesi", value: "< 3 sn" },
    { label: "Saha uyumluluk görünürlüğü", value: "%97+" },
  ];

  const trustPillars = [
    "Operasyon ekipleri için tasarlandı",
    "Endüstriyel güvenlik senaryolarına odaklı",
    "Mevcut IP kamera altyapısıyla uyumlu",
  ];

  const renderFeatureIcon = (icon: string) => {
    if (icon === "ppe") {
      return (
        <svg viewBox="0 0 24 24" className="h-5 w-5 text-[#8b6d2f]" fill="none" stroke="currentColor" strokeWidth="1.7">
          <path d="M4 13.5h16v5a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18.5v-5Z" />
          <path d="M7 13.5V11a5 5 0 0 1 10 0v2.5" />
          <path d="M10 8.8h4" />
        </svg>
      );
    }
    if (icon === "zone") {
      return (
        <svg viewBox="0 0 24 24" className="h-5 w-5 text-[#8b6d2f]" fill="none" stroke="currentColor" strokeWidth="1.7">
          <rect x="4" y="4" width="16" height="16" rx="2.5" />
          <path d="M8 8h8v8H8z" strokeDasharray="2 2" />
          <path d="M16.5 7.5 7.5 16.5" />
        </svg>
      );
    }
    if (icon === "proximity") {
      return (
        <svg viewBox="0 0 24 24" className="h-5 w-5 text-[#8b6d2f]" fill="none" stroke="currentColor" strokeWidth="1.7">
          <circle cx="7.5" cy="12" r="2.5" />
          <rect x="14" y="9" width="5" height="6" rx="1.5" />
          <path d="M10.5 12h2.5" />
          <path d="M12.5 8.7a4 4 0 0 1 0 6.6" />
        </svg>
      );
    }
    if (icon === "alert") {
      return (
        <svg viewBox="0 0 24 24" className="h-5 w-5 text-[#8b6d2f]" fill="none" stroke="currentColor" strokeWidth="1.7">
          <path d="M12 4.5 20 18H4L12 4.5Z" />
          <path d="M12 9v4.2" />
          <circle cx="12" cy="15.8" r="0.9" fill="currentColor" stroke="none" />
        </svg>
      );
    }
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5 text-[#8b6d2f]" fill="none" stroke="currentColor" strokeWidth="1.7">
        <rect x="4" y="4" width="16" height="16" rx="2.5" />
        <path d="M8 9.5h8M8 12h8M8 14.5h5" />
      </svg>
    );
  };

  return (
    <div className="bg-[#FAF5EF] text-slate-900">
      <header className="sticky top-0 z-50 border-b border-soft-border/80 bg-[#FAF5EF]/95 backdrop-blur-md">
        <div className="mx-auto flex min-h-16 w-full max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6 md:min-h-24 md:px-10 md:py-0">
          <a href="/" className="flex min-w-0 items-center gap-2 sm:gap-3">
            <BrandLogo priority />
            <span className="text-xl font-medium tracking-tight sm:text-2xl">Luro</span>
          </a>
          <nav className="hidden items-center gap-6 xl:gap-8 lg:flex">
            {navItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="text-sm text-slate-600 transition-colors duration-200 hover:text-slate-900"
              >
                {item.label}
              </a>
            ))}
          </nav>
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <a
              href="/demo"
              className="rounded-xl border border-[#0b1f3a]/15 bg-navy px-3 py-2.5 text-xs font-medium text-slate-50 transition-all duration-200 hover:bg-[#0f2a52] sm:px-5 sm:text-sm md:hover:-translate-y-0.5"
            >
              <span className="sm:hidden">Demo</span>
              <span className="hidden sm:inline">Demo Talep Et</span>
            </a>
            <button
              type="button"
              className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-soft-border bg-white text-slate-800 lg:hidden"
              aria-expanded={navOpen}
              aria-controls="mobile-main-nav"
              aria-label={navOpen ? "Menüyü kapat" : "Menüyü aç"}
              onClick={() => setNavOpen((o) => !o)}
            >
              {navOpen ? (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>
        <nav
          id="mobile-main-nav"
          className={`border-t border-soft-border bg-[#FAF5EF] lg:hidden ${navOpen ? "block" : "hidden"}`}
          aria-hidden={!navOpen}
        >
          <div className="mx-auto max-w-6xl px-4 py-3 sm:px-6 md:px-10">
            <div className="flex flex-col">
              {navItems.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className="rounded-xl px-3 py-3 text-base text-slate-700 active:bg-surface-soft"
                  onClick={() => setNavOpen(false)}
                >
                  {item.label}
                </a>
              ))}
            </div>
          </div>
        </nav>
      </header>

      <main>
        <section id="cozum" className="border-b border-soft-border bg-grid-soft">
          <div className="mx-auto w-full max-w-6xl px-4 pb-14 pt-14 sm:px-6 md:px-10 md:pb-24 md:pt-24">
            <div className="reveal-up mx-auto max-w-3xl space-y-7 text-center">
              <p className="inline-flex rounded-full border border-soft-border bg-surface-soft px-3 py-1 text-xs tracking-wide text-slate-500">
                Endüstriyel güvenlik için AI izleme katmanı
              </p>
              <div className="space-y-5">
                <h1 className="mx-auto max-w-3xl text-[1.75rem] font-medium leading-tight tracking-tight text-slate-900 sm:text-4xl md:text-6xl">
                  Riskleri kazadan önce görün.
                </h1>
                <p className="mx-auto max-w-2xl text-base leading-8 text-muted md:text-lg">
                  Luro, endüstriyel sahalar ve operasyonel ortamlar için geliştirilmiş
                  yapay zeka destekli bir güvenlik izleme platformudur. Mevcut kamera
                  sistemlerinizi aktif, ölçülebilir ve sürekli çalışan bir güvenlik
                  katmanına dönüştürür.
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-4">
                <a
                  href="/demo"
                  className="rounded-xl bg-navy px-6 py-3 text-sm font-medium text-slate-50 transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#0f2a52]"
                >
                  Demo Talep Et
                </a>
                <a
                  href="/cozum"
                  className="rounded-xl border border-soft-border bg-white px-6 py-3 text-sm font-medium text-slate-700 transition-colors duration-200 hover:border-slate-300 hover:text-slate-900"
                >
                  Daha Fazla Bilgi
                </a>
              </div>
            </div>
            <div className="reveal-up mt-14 grid gap-4 md:mt-16 md:grid-cols-3" style={{ animationDelay: "0.08s" }}>
              {trustStats.map((stat) => (
                <div key={stat.label} className="rounded-2xl border border-soft-border bg-surface-soft p-6 text-left">
                  <p className="text-3xl font-medium tracking-tight text-slate-900">{stat.value}</p>
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
                  <p className="text-sm text-slate-500">Canlı İzleme</p>
                  <h2 className="text-lg font-medium text-slate-900">Operasyon Özeti</h2>
                </div>
                <span className="rounded-full border border-[#d4a64a]/35 bg-[#d4a64a]/10 px-3 py-1 text-xs font-medium text-[#9a762f]">
                  Aktif
                </span>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-soft-border bg-slate-50 p-4">
                  <p className="text-xs text-slate-500">Kamera Akışı A / Hat 3</p>
                  <svg viewBox="0 0 320 170" className="mt-3 h-auto w-full rounded-lg border border-soft-border bg-white">
                    <rect x="1" y="1" width="318" height="168" rx="10" fill="#F8FAFC" stroke="rgba(15,23,42,0.08)" />
                    <rect x="18" y="26" width="128" height="98" rx="8" fill="#E2E8F0" />
                    <rect x="162" y="40" width="138" height="84" rx="8" fill="#CBD5E1" />
                    <rect x="96" y="20" width="62" height="114" rx="8" fill="none" stroke="#D4A64A" strokeWidth="2" />
                    <circle cx="291" cy="24" r="5" fill="#16A34A" />
                    <text x="20" y="150" fill="#475569" fontSize="10">PPE Uyum: %98</text>
                  </svg>
                </div>
                <div className="rounded-xl border border-soft-border bg-slate-50 p-4">
                  <p className="text-xs text-slate-500">Kamera Akışı B / Depo Giriş</p>
                  <svg viewBox="0 0 320 170" className="mt-3 h-auto w-full rounded-lg border border-soft-border bg-white">
                    <rect x="1" y="1" width="318" height="168" rx="10" fill="#F8FAFC" stroke="rgba(15,23,42,0.08)" />
                    <rect x="20" y="24" width="280" height="20" rx="6" fill="#E2E8F0" />
                    <rect x="20" y="55" width="280" height="74" rx="8" fill="#CBD5E1" />
                    <rect x="214" y="64" width="68" height="54" rx="8" fill="none" stroke="#D4A64A" strokeWidth="2" />
                    <rect x="20" y="138" width="94" height="14" rx="4" fill="#1E293B" opacity="0.12" />
                    <text x="125" y="149" fill="#475569" fontSize="10">Bölge İhlali: 2</text>
                  </svg>
                </div>
              </div>
              <div className="mt-4 space-y-3 rounded-xl border border-soft-border p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Uyarı Listesi
                </p>
                {[
                  "Baret eksikliği - Hat 3 / 14:08",
                  "Yasaklı bölge geçişi - Depo B / 13:51",
                  "Yakınlık riski - Forklift Alanı / 13:37",
                ].map((alert) => (
                  <div
                    key={alert}
                    className="flex flex-col gap-2 rounded-lg border border-soft-border bg-slate-50 px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <span className="break-words text-sm text-slate-700">{alert}</span>
                    <span className="h-2 w-2 shrink-0 self-start rounded-full bg-[#d4a64a] sm:self-center" />
                  </div>
                ))}
              </div>
              <div className="mt-4 rounded-xl border border-soft-border bg-slate-50 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Olay Günlüğü
                </p>
                <div className="mt-3 space-y-2 text-sm text-slate-600">
                  <p>14:12 - PPE Uygun</p>
                  <p>14:08 - Uyarı oluşturuldu</p>
                  <p>14:05 - Operasyon ekibi bilgilendirildi</p>
                </div>
              </div>
            </div>
            <div className="reveal-up space-y-6 self-center" style={{ animationDelay: "0.16s" }}>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#9a762f]">Canlı ürün görünümü</p>
              <h2 className="text-3xl font-medium tracking-tight text-slate-900 md:text-4xl">
                Karar vericiler için tek bakışta güvenlik resmi.
              </h2>
              <p className="text-base leading-8 text-slate-600">
                Görsel yoğunluğu düşük, operasyonel sinyali yüksek bir panel yapısıyla saha risklerini
                anlık olarak görün, önceliklendirin ve aksiyona dönüştürün.
              </p>
              <div className="rounded-2xl border border-soft-border bg-slate-50 p-5">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Güven sinyalleri</p>
                <div className="mt-3 space-y-2">
                  {[
                    "Olayların zaman damgalı kayıt zinciri",
                    "Denetim ekipleri için doğrulanabilir raporlar",
                    "Saha ve merkez ekipleri için ortak görünürlük",
                  ].map((item) => (
                    <p key={item} className="text-sm text-slate-700">
                      {item}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-soft-border bg-[#FAF5EF]">
          <div className="mx-auto grid w-full max-w-6xl gap-12 px-4 py-16 sm:px-6 md:px-10 md:py-24 lg:grid-cols-[1.05fr_1fr]">
            <div className="reveal-up space-y-4">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#9a762f]">
                Neden Luro
              </p>
              <h2 className="max-w-xl text-3xl font-medium tracking-tight text-slate-900 md:text-4xl">
                Kameralar var, fakat güvenlik görünürlüğü hâlâ sınırlı.
              </h2>
            </div>
            <div
              className="reveal-up space-y-5 text-base leading-8 text-slate-600"
              style={{ animationDelay: "0.08s" }}
            >
              <p>
                Birçok tesiste güvenlik kamerası altyapısı bulunuyor; ancak bu sistemler
                genellikle olay sonrasında izlenen pasif kayıt kaynakları olarak kullanılıyor.
              </p>
              <p>
                Manuel izleme sürekli dikkat gerektirir ve kritik anlarda gecikme
                oluşturabilir. Endüstriyel ortamlar ise reaktif değil, proaktif görünürlük
                ister.
              </p>
              <p className="font-medium text-slate-800">
                Luro, bu boşluğu kapatarak riskleri kazaya dönüşmeden önce tespit eden
                operasyonel bir güvenlik katmanı sağlar.
              </p>
            </div>
          </div>
        </section>

        <section id="ozellikler" className="border-b border-soft-border bg-[#FAF5EF]">
          <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 md:px-10 md:py-24">
            <div className="reveal-up mb-12 max-w-2xl space-y-4">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#9a762f]">
                Özellikler
              </p>
              <h2 className="text-3xl font-medium tracking-tight text-slate-900 md:text-4xl">
                Sahada gerçek zamanlı, ölçülebilir ve eyleme dönük güvenlik zekâsı.
              </h2>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {featureItems.map((feature, index) => (
                <article
                  key={feature.title}
                  className="reveal-up rounded-2xl border border-soft-border bg-surface-soft p-6 transition-transform duration-200 hover:-translate-y-0.5"
                  style={{ animationDelay: `${0.05 * index}s` }}
                >
                  <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[#d4a64a]/40 bg-[#d4a64a]/10">
                    {renderFeatureIcon(feature.icon)}
                  </div>
                  <h3 className="text-lg font-medium tracking-tight text-slate-900">
                    {feature.title}
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-slate-600">{feature.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="kullanim-alanlari" className="border-b border-soft-border bg-[#FAF5EF]">
          <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-16 sm:px-6 md:px-10 md:py-24 lg:grid-cols-[1fr_1fr]">
            <div className="reveal-up space-y-4">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#9a762f]">
                Kullanım Alanları
              </p>
              <h2 className="text-3xl font-medium tracking-tight text-slate-900 md:text-4xl">
                Farklı operasyon tipleri için ölçeklenebilir güvenlik modeli.
              </h2>
              <p className="text-base leading-8 text-slate-600">
                Luro, sahaya özel kurulum karmaşası oluşturmadan farklı endüstriyel
                ortamlara hızla uyarlanır.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {useCases.map((item, index) => (
                <div
                  key={item}
                  className="reveal-up rounded-2xl border border-soft-border bg-white p-6"
                  style={{ animationDelay: `${0.08 * index}s` }}
                >
                  <p className="text-sm text-muted">Sektör</p>
                  <h3 className="mt-2 text-xl font-medium tracking-tight text-slate-900">{item}</h3>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="kurucular" className="border-b border-soft-border bg-surface-soft">
          <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 md:px-10 md:py-24">
            <div className="reveal-up mb-12 max-w-2xl space-y-4">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#9a762f]">
                Kurucular
              </p>
              <h2 className="text-3xl font-medium tracking-tight text-slate-900 md:text-4xl">
                Luro&apos;yu birlikte inşa eden ekip.
              </h2>
              <p className="text-base leading-8 text-slate-600">
                Endüstriyel güvenlik ve yapay zekâ odağında çalışan kurucu ortaklarımızla tanışın.
              </p>
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
                    LinkedIn profili
                  </a>
                </article>
              ))}
            </div>
          </div>
        </section>

        <div
          aria-hidden
          className="h-20 bg-gradient-to-b from-[#FAF5EF] via-[#18355b] to-[#0b1f3a]"
        />

        <section id="iletisim" className="bg-navy">
          <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 md:px-10 md:py-24">
            <div className="reveal-up rounded-3xl border border-white/15 bg-white/[0.04] p-6 sm:p-10 md:p-14">
              <Image
                src="/logo-gold.png"
                alt="Luro Altın Logo"
                width={56}
                height={56}
                className="mb-5 rounded-2xl"
              />
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-[#d4a64a]">
                Sonraki Adım
              </p>
              <h2 className="mt-4 max-w-3xl text-3xl font-medium tracking-tight text-slate-50 md:text-5xl">
                Güvenlik süreçlerinizi daha görünür ve daha proaktif hale getirin.
              </h2>
              <p className="mt-5 max-w-2xl text-base leading-8 text-slate-300">
                Luro ile mevcut kamera altyapınızı kullanarak operasyonel riskleri erken
                aşamada tespit edin, ekiplerinizi daha güvenli bir çalışma düzeniyle
                destekleyin.
              </p>
              <div className="mt-8 flex flex-wrap gap-4">
                <a
                  href="/demo"
                  className="rounded-xl bg-[#d4a64a] px-6 py-3 text-sm font-medium text-[#1e2b3f] transition-colors duration-200 hover:bg-[#e1b558]"
                >
                  Demo Talep Et
                </a>
                <a
                  href="/demo#iletisim-form"
                  className="rounded-xl border border-white/20 px-6 py-3 text-sm font-medium text-slate-100 transition-colors duration-200 hover:border-white/40 hover:bg-white/10"
                >
                  İletişime Geç
                </a>
              </div>
            </div>
          </div>
        </section>

        <div
          aria-hidden
          className="h-16 bg-gradient-to-b from-[#0b1f3a] via-[#18355b] to-[#FAF5EF]"
        />
      </main>

      <footer className="border-t border-soft-border bg-[#FAF5EF]">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-10 text-sm text-slate-600 sm:px-6 md:flex-row md:items-end md:justify-between md:px-10">
          <div className="space-y-2">
            <p className="text-base font-medium text-slate-900">Luro</p>
            <p className="max-w-md">
              Endüstriyel operasyonlar için yapay zeka destekli, proaktif güvenlik
              izleme platformu.
            </p>
          </div>
          <div className="space-y-2 text-left md:text-right">
            <a
              href="mailto:hello@luro-ai.com"
              className="block break-all transition-colors duration-200 hover:text-slate-900"
            >
              hello@luro-ai.com
            </a>
            <a
              href="https://www.linkedin.com/company/luroai-tech/"
              target="_blank"
              rel="noopener noreferrer"
              className="block transition-colors duration-200 hover:text-slate-900"
            >
              LinkedIn
            </a>
            <p className="text-xs text-slate-500">© {new Date().getFullYear()} Luro. Tüm hakları saklıdır.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
