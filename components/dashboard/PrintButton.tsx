"use client";

import { useI18n } from "@/components/i18n/I18nProvider";

export function PrintButton() {
  const { t } = useI18n();
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="no-print inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-accent-strong"
    >
      {t("dashboard.reportPrint")}
    </button>
  );
}
