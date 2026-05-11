import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { I18nProvider } from "@/components/i18n/I18nProvider";
import { LuroChatWidget } from "../components/LuroChatWidget";
import { getTranslator } from "@/lib/i18n/getTranslator";
import { getLocale } from "@/lib/i18n/server";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = getTranslator(locale);
  return {
    title: t("meta.title"),
    description: t("meta.description"),
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#faf5ef",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();

  return (
    <html lang={locale === "en" ? "en" : "tr"} className={`${inter.variable} h-full antialiased`}>
      <body className="flex min-h-dvh min-h-screen flex-col overflow-x-clip">
        <I18nProvider initialLocale={locale}>
          {children}
          <LuroChatWidget />
        </I18nProvider>
      </body>
    </html>
  );
}
