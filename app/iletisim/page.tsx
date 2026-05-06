import Link from "next/link";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { marketingNavItems } from "@/components/marketing/nav";

export default function ContactPage() {
  return (
    <div className="bg-[#FAF5EF] text-slate-900">
      <MarketingHeader variant="landing" navItems={marketingNavItems} />
      <main className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 md:px-10 md:py-20">
        <h1 className="text-4xl font-medium tracking-tight md:text-5xl">İletişim</h1>
        <p className="mt-4 max-w-3xl text-base leading-8 text-slate-600">
          Ekibimizle doğrudan iletişim kurun veya demo talebinizi iletin.
        </p>
        <div className="mt-8 rounded-2xl border border-soft-border bg-white p-6">
          <p className="text-sm text-slate-600">
            E-posta:{" "}
            <a href="mailto:luroai.tech@gmail.com" className="font-medium text-slate-800">
              luroai.tech@gmail.com
            </a>
          </p>
          <Link href="/demo" className="mt-4 inline-block rounded-xl bg-navy px-5 py-2.5 text-sm font-medium text-slate-50">
            Demo Formuna Git
          </Link>
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}
