export type MarketingNavItem = {
  label: string;
  href: string;
};

export const marketingNavItems: MarketingNavItem[] = [
  { label: "Ürün", href: "/urun" },
  { label: "Depo Çözümü", href: "/cozumler/depo" },
  { label: "Üretim Çözümü", href: "/cozumler/uretim" },
  { label: "Modüller", href: "/guvenlik-modulleri" },
  { label: "Risk Analitik", href: "/risk-analitik" },
  { label: "Kaynaklar", href: "/kaynaklar" },
  { label: "İletişim", href: "/iletisim" },
];
