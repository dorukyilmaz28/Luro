import type { Metadata, Viewport } from "next";
import { Instrument_Sans, Newsreader } from "next/font/google";
import { I18nProvider } from "@/components/i18n/I18nProvider";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { LuroChatWidget } from "../components/LuroChatWidget";
import { getTranslator } from "@/lib/i18n/getTranslator";
import { getLocale } from "@/lib/i18n/server";
import "./globals.css";

const instrumentSans = Instrument_Sans({
  variable: "--font-instrument",
  subsets: ["latin"],
  display: "swap",
});

const newsreader = Newsreader({
  variable: "--font-newsreader",
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
  themeColor: "#f7f9fc",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();

  return (
    <html
      lang={locale === "en" ? "en" : "tr"}
      className={`${instrumentSans.variable} ${newsreader.variable} h-full antialiased`}
    >
      <body className="flex min-h-dvh min-h-screen flex-col overflow-x-clip">
        <I18nProvider initialLocale={locale}>
          <AuthProvider>
            {children}
            <LuroChatWidget />
          </AuthProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
