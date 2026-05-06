import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { marketingNavItems } from "@/components/marketing/nav";

export default function RiskAnalyticsPage() {
  return (
    <div className="bg-[#FAF5EF] text-slate-900">
      <MarketingHeader variant="landing" navItems={marketingNavItems} />
      <main className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 md:px-10 md:py-20">
        <h1 className="text-4xl font-medium tracking-tight md:text-5xl">Risk Analitik</h1>
        <p className="mt-4 max-w-3xl text-base leading-8 text-slate-600">
          Kamera bazlı risk skoru, ihlal ısı haritası ve proaktif önerilerle operasyonel karar sürecini destekler.
        </p>
      </main>
      <MarketingFooter />
    </div>
  );
}
