import Link from "next/link";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { marketingNavItems } from "@/components/marketing/nav";

export default function HomePage() {
  return (
    <div className="bg-[#FAF5EF] text-slate-900">
      <MarketingHeader variant="landing" navItems={marketingNavItems} />
      <main>
        <section className="border-b border-soft-border bg-grid-soft">
          <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 md:px-10 md:py-24">
            <p className="inline-flex rounded-full border border-soft-border bg-surface-soft px-3 py-1 text-xs tracking-wide text-slate-500">
              Endüstriyel AI Güvenlik Platformu
            </p>
            <h1 className="mt-5 max-w-4xl text-4xl font-medium tracking-tight sm:text-5xl md:text-6xl">
              Tespitten karar desteğine: sahadaki riski yönetin.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-slate-600 md:text-lg">
              Luro, kamera altyapınızı gerçek zamanlı risk görünürlüğü ve operasyonel öneri
              katmanına dönüştürür.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/demo" className="rounded-xl bg-navy px-6 py-3 text-sm font-medium text-slate-50">
                Demo Talep Et
              </Link>
              <Link href="/urun" className="rounded-xl border border-soft-border bg-white px-6 py-3 text-sm font-medium text-slate-700">
                Ürünü İncele
              </Link>
            </div>
          </div>
        </section>

        <section className="mx-auto grid w-full max-w-6xl gap-4 px-4 py-12 sm:px-6 md:grid-cols-3 md:px-10 md:py-16">
          {[
            { t: "Risk Skoru", d: "Kamera ve vardiya bazlı canlı risk puanı." },
            { t: "Isı Haritası", d: "İhlal yoğunluğu bölgelere göre görünür." },
            { t: "Proaktif Öneri", d: "Sadece uyarı değil, uygulanabilir aksiyon." },
          ].map((item) => (
            <article key={item.t} className="rounded-2xl border border-soft-border bg-white/80 p-6">
              <h2 className="text-xl font-medium">{item.t}</h2>
              <p className="mt-2 text-sm leading-7 text-slate-600">{item.d}</p>
            </article>
          ))}
        </section>
      </main>
      <MarketingFooter />
    </div>
  );
}
