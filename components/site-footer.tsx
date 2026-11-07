import Link from "next/link";
import { LogoMark } from "@/components/brand/logo-mark";
import { TELEGRAM_BOT_URL } from "@/lib/links";
import { SUPPORT_CONTACTS, whatsappLink } from "@/lib/support";

/** A fixed year: reading the clock during render is not allowed on cached pages. */
const YEAR = 2026;

type Item = { label: string; href: string; external?: boolean };

const COLUMNS: { title: string; items: Item[] }[] = [
  {
    title: "Product",
    items: [
      { label: "Services", href: "/#services" },
      { label: "How it works", href: "/#how-it-works" },
      { label: "Gallery", href: "/#gallery" },
      { label: "Pricing", href: "/#pricing" },
      { label: "FAQ", href: "/#faq" },
    ],
  },
  {
    title: "Account",
    items: [
      { label: "Dashboard", href: "/dashboard" },
      { label: "Generate codes", href: "/dashboard/generate" },
      { label: "Upgrade to VIP", href: "/dashboard/upgrade" },
      { label: "Sign in", href: "/login" },
      { label: "Create account", href: "/register" },
    ],
  },
  {
    title: "Support",
    items: [
      { label: "Telegram bot", href: TELEGRAM_BOT_URL, external: true },
      ...SUPPORT_CONTACTS.map((c) => ({
        label: `${c.name} on WhatsApp`,
        href: whatsappLink(c.number),
        external: true,
      })),
    ],
  },
];

/** One footer for the landing page and the signed-in dashboard. */
export function SiteFooter({ className = "" }: { className?: string }) {
  return (
    <footer className={`qo-sitefoot ${className}`.trim()}>
      <div className="qo-sitefoot-top">
        <div className="qo-sitefoot-brand">
          <Link href="/" className="qo-logo" aria-label="Quest Codes home">
            <LogoMark />
            Quest Codes
          </Link>
          <p>SportyBet booking codes on the web or in Telegram.</p>
        </div>

        <nav className="qo-sitefoot-cols" aria-label="Footer">
          {COLUMNS.map((col) => (
            <div key={col.title}>
              <h2>{col.title}</h2>
              <ul>
                {col.items.map((item) => (
                  <li key={item.label}>
                    {item.external ? (
                      <a href={item.href} target="_blank" rel="noopener noreferrer">
                        {item.label}
                      </a>
                    ) : (
                      <Link href={item.href}>{item.label}</Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </div>

      <div className="qo-sitefoot-legal">
        <p>
          <strong>Disclaimer:</strong> Quest Codes is an independent third-party platform and is not
          affiliated with, associated with, endorsed by, or officially connected to SportyBet or any of its
          subsidiaries or partners. SportyBet is a trademark of its respective owner; references to SportyBet
          are for identification and compatibility purposes only.
        </p>
        <p>
          Quest Codes never places bets or handles your betting funds. Gambling involves risk. Must be of
          legal age in your jurisdiction (18+). If gambling is a problem, seek help.
        </p>
      </div>

      <div className="qo-sitefoot-bar">
        <span>© {YEAR} Quest Codes. All rights reserved.</span>
        <span>Not affiliated with SportyBet.</span>
      </div>
    </footer>
  );
}
