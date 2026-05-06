import Link from "next/link";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { marketingNavItems } from "@/components/marketing/nav";

export default function ProductPage() {
  return (
    <div className="bg-[#FAF5EF] text-slate-900">
      <MarketingHeader variant="landing" navItems={marketingNavItems} />
      <main className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 md:px-10 md:py-20">
        <h1 className="text-4xl font-medium tracking-tight md:text-5xl">Luro Ürün Katmanları</h1>
        <p className="mt-4 max-w-3xl text-base leading-8 text-slate-600">
          Tespit, olay motoru, risk analitik ve öneri katmanlarını tek panelde birleştirir.
        </p>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {[
            "Gerçek zamanlı PPE, bölge ve yakınlık tespitleri",
            "Kamera bazlı kural ve modül yönetimi",
            "Risk skoru, trend ve ısı haritası",
            "Eyleme dönük öneri ve rapor",
          ].map((text) => (
            <div key={text} className="rounded-xl border border-soft-border bg-white p-5 text-sm text-slate-700">
              {text}
            </div>
          ))}
        </div>
        <div className="mt-10 flex gap-3">
          <Link href="/guvenlik-modulleri" className="rounded-xl border border-soft-border bg-white px-5 py-2.5 text-sm font-medium text-slate-700">
            Modüller
          </Link>
          <Link href="/risk-analitik" className="rounded-xl border border-soft-border bg-white px-5 py-2.5 text-sm font-medium text-slate-700">
            Risk Analitik
          </Link>
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}
