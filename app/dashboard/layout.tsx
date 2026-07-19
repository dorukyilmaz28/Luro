import { redirect } from "next/navigation";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { getTranslator } from "@/lib/i18n/getTranslator";
import { getLocale } from "@/lib/i18n/server";
import { getSession } from "@/lib/auth/session";

export default async function Layout({ children }: { children: React.ReactNode }) {
  const user = await getSession();

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
