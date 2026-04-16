import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { LuroChatWidget } from "../components/LuroChatWidget";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Luro | Endüstriyel AI Güvenlik İzleme Platformu",
  description:
    "Luro, mevcut kamera sistemlerini yapay zeka ile aktif güvenlik araçlarına dönüştürerek riskleri kazaya dönüşmeden önce tespit eder.",
  icons: {
    icon: [{ url: "/logo-dark.png", type: "image/png" }],
    apple: [{ url: "/logo-dark.png", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#faf5ef",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" className={`${inter.variable} h-full antialiased`}>
      <body className="flex min-h-dvh min-h-screen flex-col overflow-x-clip">
        {children}
        <LuroChatWidget />
      </body>
    </html>
  );
}
