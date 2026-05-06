import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { marketingNavItems } from "@/components/marketing/nav";

export default function ModulesPage() {
  return (
    <div className="bg-[#FAF5EF] text-slate-900">
      <MarketingHeader variant="landing" navItems={marketingNavItems} />
      <main className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 md:px-10 md:py-20">
        <h1 className="text-4xl font-medium tracking-tight md:text-5xl">Güvenlik Modülleri</h1>
        <ul className="mt-6 grid gap-3 md:grid-cols-2">
          {["Baret Eksikliği", "Yelek Eksikliği", "Yasaklı Bölge", "Araç-Personel Yakınlığı", "Yangın / Duman"].map((m) => (
            <li key={m} className="rounded-xl border border-soft-border bg-white p-4 text-sm text-slate-700">
              {m}
            </li>
          ))}
        </ul>
      </main>
      <MarketingFooter />
    </div>
  );
}
