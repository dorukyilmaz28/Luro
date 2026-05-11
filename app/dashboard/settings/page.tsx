import { LogoutButton } from "@/components/auth/LogoutButton";
import { getTranslator } from "@/lib/i18n/getTranslator";
import { getLocale } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const t = getTranslator(await getLocale());

  return (
    <div className="max-w-2xl space-y-5">
      <div>
        <p className="text-xs uppercase tracking-[0.18em] text-[#d4a64a]">{t("dashboard.settingsEyebrow")}</p>
        <h1 className="mt-2 text-2xl font-medium tracking-tight text-slate-900">{t("dashboard.settingsTitle")}</h1>
      </div>

      <section className="rounded-2xl border border-[#e6d9ca] bg-white/80 p-5">
        <p className="text-xs uppercase tracking-[0.14em] text-slate-500">{t("dashboard.settingsEmail")}</p>
        <p className="mt-2 text-base text-slate-900">{user?.email ?? "-"}</p>
      </section>

      <section className="rounded-2xl border border-[#e6d9ca] bg-white/80 p-5">
        <p className="text-xs uppercase tracking-[0.14em] text-slate-500">{t("dashboard.settingsCompany")}</p>
        <p className="mt-2 text-base text-slate-900">{t("dashboard.companyPlaceholder")}</p>
      </section>

      <LogoutButton className="rounded-xl border border-[#d4a64a]/45 bg-[#d4a64a]/10 px-4 py-2.5 text-sm font-medium text-[#8b6d2f] transition hover:bg-[#d4a64a]/20" />
    </div>
  );
}
