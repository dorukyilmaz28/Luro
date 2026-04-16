import Image from "next/image";

type BrandLogoProps = {
  /** Ana sayfa gibi LCP görseli olan yerlerde true verin (Next `priority` = eager). */
  priority?: boolean;
};

export function BrandLogo({ priority = false }: BrandLogoProps) {
  return (
    <Image
      src="/logo-dark.png"
      alt="Luro Logo"
      width={128}
      height={128}
      sizes="62px"
      priority={priority}
      className="h-[52px] w-auto sm:h-[62px]"
      style={{ width: "auto", height: "auto" }}
    />
  );
}
