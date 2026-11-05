import Image from "next/image";

/** The Quest Codes mark (public/logo.svg). Sized in em so it scales with the wordmark beside it. */
export function LogoMark({ className = "qo-logo-mark" }: { className?: string }) {
  return (
    <Image
      src="/logo.svg"
      alt=""
      width={68}
      height={41}
      className={className}
      unoptimized // already an SVG
      priority
    />
  );
}
