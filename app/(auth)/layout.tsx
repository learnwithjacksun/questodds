import Link from "next/link";
import { LogoMark } from "@/components/brand/logo-mark";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="qo-auth">
      <Link href="/" className="qo-logo qo-auth-logo" aria-label="Quest Codes home">
        <LogoMark />
        Quest Codes
      </Link>
      <main className="qo-auth-card">{children}</main>
      <p className="qo-auth-disclaimer">
        Quest Codes is an independent third-party platform and is not affiliated with, endorsed by, or
        officially connected to SportyBet or any of its subsidiaries or partners.
      </p>
    </div>
  );
}
