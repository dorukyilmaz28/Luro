"use client";

import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import Image from "next/image";
import Link from "next/link";
import { useEffect } from "react";

export default function CozumPage() {
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

  const steps = [
    {
      title: "Kamera akışı sisteme alınır",
      text: "Luro, mevcut IP kamera altyapısına entegre olur ve görüntü akışını analiz edilebilir hale getirir.",
    },
    {
      title: "Görüntü gerçek zamanlı analiz edilir",
      text: "Bilgisayarlı görü modelleri, sahadaki akışı sürekli değerlendirir ve risk senaryolarını kontrol eder.",
    },
    {
      title: "Riskli durumlar olay olarak işlenir",
      text: "Tespit edilen durumlar sınıflandırılır, önceliklendirilir ve takip edilebilir olay kaydına dönüştürülür.",
    },
    {
      title: "Uyarı, kayıt ve rapor üretilir",
      text: "Ekipler anlık bildirim alır; olay geçmişi ve raporlar üzerinden süreç görünür hale gelir.",
    },
  ];

  const capabilities = [
    "Kişisel koruyucu ekipman tespiti",
    "Yasaklı alan ihlali tespiti",
    "Yakınlık risk analizi",
    "Gerçek zamanlı uyarılar",
    "Olay kaydı ve raporlama",
  ];

  const useAreas = [
    "İnşaat sahaları",
    "Depolar",
    "Lojistik merkezleri",
    "Üretim alanları",
    "Diğer operasyonel ortamlar",
  ];

  return (
    <div className="bg-[#FAF5EF] text-slate-900">
      <MarketingHeader
        variant="compact"
        compactLinks={[
          { label: "Ana Sayfa", href: "/" },
          { label: "Demo Talep Et", href: "/demo", primary: true },
        ]}
      />

      <main>
        <section className="border-b border-soft-border bg-grid-soft">
          <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 md:px-10 md:py-24">
            <div className="reveal-up max-w-3xl space-y-5">
              <p className="inline-flex rounded-full border border-soft-border bg-surface-soft px-3 py-1 text-xs tracking-wide text-slate-500">
                Çözüm
              </p>
              <h1 className="text-[1.75rem] font-medium leading-tight tracking-tight sm:text-4xl md:text-6xl">
                Endüstriyel sahalar için daha akıllı güvenlik takibi
              </h1>
              <p className="text-base leading-8 text-slate-600 md:text-lg">
                Luro, mevcut kamera altyapınızı aktif, ölçülebilir ve proaktif bir güvenlik sistemine
                dönüştürür. Sahadaki riskleri gerçek zamanlı görünür hale getirir ve ekiplerin hızlı aksiyon
                almasını destekler.
              </p>
            </div>
          </div>
        </section>

        <section className="border-b border-soft-border bg-[#FAF5EF]">
          <div className="mx-auto grid w-full max-w-6xl gap-10 px-6 py-18 md:px-10 md:py-24 lg:grid-cols-2">
            <article className="reveal-up rounded-2xl border border-soft-border bg-surface-soft p-7">
              <h2 className="text-2xl font-medium tracking-tight">Luro nedir?</h2>
              <p className="mt-4 text-sm leading-7 text-slate-600">
                Luro, endüstriyel sahalar ve operasyonel ortamlar için geliştirilmiş AI destekli güvenlik
                izleme platformudur. Kamera görüntüsünü yalnızca kayıt olarak tutmaz; riskleri tespit eden
                aktif bir güvenlik katmanına dönüştürür.
              </p>
            </article>
            <article className="reveal-up rounded-2xl border border-soft-border bg-surface-soft p-7" style={{ animationDelay: "0.08s" }}>
              <h2 className="text-2xl font-medium tracking-tight">Neden Luro?</h2>
              <ul className="mt-4 space-y-2 text-sm leading-7 text-slate-600">
                <li>Kameralar çoğu tesiste var, fakat çoğunlukla pasif kullanılıyor.</li>
                <li>Manuel izleme süreklilik ve dikkat açısından sınırlı kalıyor.</li>
                <li>Operasyon ekipleri olay sonrası değil, olay öncesi görünürlük istiyor.</li>
              </ul>
            </article>
          </div>
        </section>

        <section className="border-b border-soft-border bg-surface-soft">
          <div className="mx-auto w-full max-w-6xl px-6 py-18 md:px-10 md:py-24">
            <div className="reveal-up mb-10 max-w-2xl space-y-4">
              <h2 className="text-3xl font-medium tracking-tight md:text-4xl">Luro nasıl çalışır?</h2>
              <p className="text-base leading-8 text-slate-600">
                Luro, mevcut kamera altyapınızı kullanarak riskleri gerçek zamanlı izler, anlamlandırır ve aksiyona
                dönüştürür.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {steps.map((step, index) => (
                <article
                  key={step.title}
                  className="reveal-up rounded-2xl border border-soft-border bg-white p-6"
                  style={{ animationDelay: `${0.06 * index}s` }}
                >
                  <p className="text-xs font-medium uppercase tracking-[0.16em] text-[#9a762f]">
                    Adım 0{index + 1}
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
              <h2 className="text-3xl font-medium tracking-tight md:text-4xl">Tespit yetenekleri</h2>
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
              <h2 className="text-3xl font-medium tracking-tight md:text-4xl">Kullanım alanları</h2>
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
              <h2 className="text-2xl font-medium tracking-tight">Entegrasyon</h2>
              <p className="mt-4 text-sm leading-7 text-slate-600">
                Luro, mevcut IP kameralarla uyumlu çalışır. Bu yaklaşım ek donanım ihtiyacını azaltır,
                devreye alma süresini kısaltır ve mevcut operasyon yapısına daha hızlı adapte olur.
              </p>
            </article>
            <article className="reveal-up rounded-2xl border border-soft-border bg-white p-7" style={{ animationDelay: "0.08s" }}>
              <h2 className="text-2xl font-medium tracking-tight">Operasyonel katkı</h2>
              <p className="mt-4 text-sm leading-7 text-slate-600">
                Güvenlik süreçlerini reaktif yaklaşımdan proaktif risk yönetimine taşır. Daha hızlı farkındalık,
                daha ölçülebilir süreç ve daha net operasyon görünürlüğü sağlar.
              </p>
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
                alt="Luro Altın Logo"
                width={56}
                height={56}
                className="mb-5 rounded-2xl"
              />
              <h2 className="max-w-3xl text-3xl font-medium tracking-tight text-slate-50 md:text-5xl">
                Sahada daha güvenli ve daha görünür bir operasyon düzeni kurun.
              </h2>
              <p className="mt-5 max-w-2xl text-base leading-8 text-slate-300">
                Luro ile mevcut kamera altyapınızı daha etkili kullanın, riskleri erken tespit edin ve güvenlik
                ekiplerinize güçlü bir karar desteği sağlayın.
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
      </main>
    </div>
  );
}
