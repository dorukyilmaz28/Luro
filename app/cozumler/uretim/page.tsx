import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { marketingNavItems } from "@/components/marketing/nav";

export default function ManufacturingSolutionPage() {
  return (
    <div className="bg-[#FAF5EF] text-slate-900">
      <MarketingHeader variant="landing" navItems={marketingNavItems} />
      <main className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 md:px-10 md:py-20">
        <h1 className="text-4xl font-medium tracking-tight md:text-5xl">Üretim Çözümü</h1>
        <p className="mt-4 max-w-3xl text-base leading-8 text-slate-600">
          Hat güvenliği, PPE zorunluluğu ve yüksek riskli çalışma bölgeleri için operasyona uygun izleme katmanı.
        </p>
      </main>
      <MarketingFooter />
    </div>
  );
}
