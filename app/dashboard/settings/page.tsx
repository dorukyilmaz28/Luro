import { LogoutButton } from "@/components/auth/LogoutButton";
import { getTranslator } from "@/lib/i18n/getTranslator";
import { getLocale } from "@/lib/i18n/server";
import { getSession } from "@/lib/auth/session";

export default async function SettingsPage() {
  const user = await getSession();
  const t = getTranslator(await getLocale());

  return (
    <div className="max-w-2xl space-y-5">
      <div>
        <p className="text-xs uppercase tracking-[0.18em] text-accent">{t("dashboard.settingsEyebrow")}</p>
        <h1 className="font-display mt-2 text-2xl text-foreground">{t("dashboard.settingsTitle")}</h1>
      </div>

      <section className="rounded-2xl border border-soft-border bg-surface-soft p-5">
        <p className="text-xs uppercase tracking-[0.14em] text-slate-500">{t("dashboard.settingsEmail")}</p>
        <p className="mt-2 text-base text-foreground">{user?.email ?? "-"}</p>
      </section>

      <section className="rounded-2xl border border-soft-border bg-surface-soft p-5">
        <p className="text-xs uppercase tracking-[0.14em] text-slate-500">{t("dashboard.settingsCompany")}</p>
        <p className="mt-2 text-base text-foreground">{user?.companyName || t("dashboard.companyPlaceholder")}</p>
      </section>

      <LogoutButton className="rounded-full border border-accent/35 bg-accent/10 px-4 py-2.5 text-sm font-medium text-accent transition hover:bg-accent/20" />
    </div>
  );
}
