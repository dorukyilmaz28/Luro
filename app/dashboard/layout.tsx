import { redirect } from "next/navigation";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { getTranslator } from "@/lib/i18n/getTranslator";
import { getLocale } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";

export default async function Layout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const locale = await getLocale();
  const t = getTranslator(locale);

  return (
    <DashboardLayout
      user={user}
      eyebrow={t("dashboard.layoutEyebrow")}
      homeLabel={t("common.home")}
      sessionFallback={t("common.sessionActive")}
    >
      {children}
    </DashboardLayout>
  );
}
