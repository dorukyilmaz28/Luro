import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { marketingNavItems } from "@/components/marketing/nav";

export default function WarehouseSolutionPage() {
  return (
    <div className="bg-[#FAF5EF] text-slate-900">
      <MarketingHeader variant="landing" navItems={marketingNavItems} />
      <main className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 md:px-10 md:py-20">
        <h1 className="text-4xl font-medium tracking-tight md:text-5xl">Depo Çözümü</h1>
        <p className="mt-4 max-w-3xl text-base leading-8 text-slate-600">
          Forklift-personel yakınlığı, yasak koridor girişleri ve PPE uyumu için depo odaklı senaryo seti.
        </p>
      </main>
      <MarketingFooter />
    </div>
  );
}
