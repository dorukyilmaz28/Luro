import Link from "next/link";

export function MarketingFooter() {
  return (
    <footer className="border-t border-soft-border bg-[#FAF5EF]">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-10 text-sm text-slate-600 sm:px-6 md:flex-row md:items-end md:justify-between md:px-10">
        <div className="space-y-2">
          <p className="text-base font-medium text-slate-900">Luro</p>
          <p className="max-w-md">
            Endüstriyel operasyonlar için yapay zeka destekli, proaktif güvenlik izleme
            ve risk karar destek platformu.
          </p>
        </div>
        <div className="space-y-2 text-left md:text-right">
          <a href="mailto:luroai.tech@gmail.com" className="block transition-colors hover:text-slate-900">
            luroai.tech@gmail.com
          </a>
          <a
            href="https://www.linkedin.com/company/luroai-tech/"
            target="_blank"
            rel="noopener noreferrer"
            className="block transition-colors hover:text-slate-900"
          >
            LinkedIn
          </a>
          <Link href="/demo" className="block transition-colors hover:text-slate-900">
            Demo Talep Et
          </Link>
          <p className="text-xs text-slate-500">© {new Date().getFullYear()} Luro. Tüm hakları saklıdır.</p>
        </div>
      </div>
    </footer>
  );
}
