import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import { TELEGRAM_BOT_URL } from "@/lib/links";
import {
  ComputerIcon,
  Coupon01Icon,
  FootballIcon,
  GameController01Icon,
  UserAdd01Icon,
  ArrowUpRight01Icon,
  Layers01Icon,
  ArrowDown01Icon,
} from "@hugeicons/core-free-icons";

type Item = { icon: IconSvgElement; title: string; body: string };

const STEPS: (Item & { n: string })[] = [
  { n: "01", icon: UserAdd01Icon, title: "Create an account", body: "Sign up on the web with just your email." },
  { n: "02", icon: Layers01Icon, title: "Pick a service", body: "Football, eFootball or vFootball from your dashboard." },
  { n: "03", icon: Coupon01Icon, title: "Get your codes", body: "We scan fixtures and mint booking codes. You open them on SportyBet and decide." },
];

const SERVICES: Item[] = [
  { icon: FootballIcon, title: "Football", body: "Upcoming fixtures scanned within a configurable odds band, ranked and grouped into booking codes." },
  { icon: GameController01Icon, title: "eFootball", body: "Live eFootball matches filtered by score and minute." },
  { icon: ComputerIcon, title: "vFootball", body: "Live virtual football matches filtered by score and minute." },
];

const FAQS: { q: string; a: string }[] = [
  {
    q: "Does Quest Codes place bets for me?",
    a: "No. It only generates booking codes. You open a code on SportyBet and choose whether to stake.",
  },
  {
    q: "Do I need Telegram?",
    a: "No. You can use the web dashboard or our Telegram bot. Pick whichever you prefer; neither is required.",
  },
  {
    q: "Are the codes guaranteed to win?",
    a: "No. Odds change, codes expire, and accumulators lose if any leg fails. Virtual football results are random. Bet responsibly and only with money you can afford to lose.",
  },
];

function IconBadge({ icon }: { icon: IconSvgElement }) {
  return (
    <span className="qo-icon-badge" aria-hidden="true">
      <HugeiconsIcon icon={icon} size={22} />
    </span>
  );
}

export function Services() {
  return (
    <section id="services" className="qo-section">
      <h2 className="qo-h2">Services</h2>
      <div className="qo-grid">
        {SERVICES.map((s) => (
          <article className="qo-card" key={s.title}>
            <IconBadge icon={s.icon} />
            <h3>{s.title}</h3>
            <p>{s.body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

export function HowItWorks() {
  return (
    <section id="how-it-works" className="qo-section">
      <h2 className="qo-h2">How it works</h2>
      <div className="qo-grid">
        {STEPS.map((s) => (
          <article className="qo-card" key={s.n}>
            <div className="qo-card-top">
              <IconBadge icon={s.icon} />
              <span className="qo-step">{s.n}</span>
            </div>
            <h3>{s.title}</h3>
            <p>{s.body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

export function TelegramSection() {
  return (
    <section id="telegram" className="qo-section">
      <div className="qo-card qo-wide">
       
        <h2 className="qo-h2">Prefer Telegram? Use it fully.</h2>
        <p>
          You don&apos;t need the dashboard. Open our Telegram bot and use Quest Codes entirely
          from chat. Choose the web dashboard or Telegram, whichever suits you.
        </p>
        <a
          href={TELEGRAM_BOT_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="qo-btn-primary qo-btn-inline"
        >
          Open Telegram bot
          <HugeiconsIcon icon={ArrowUpRight01Icon} size={18} aria-hidden="true" />
        </a>
      </div>
    </section>
  );
}

export function Faq() {
  return (
    <section id="faq" className="qo-section">
      <h2 className="qo-h2">FAQs</h2>
      <div className="qo-faq">
        {FAQS.map((f) => (
          <details key={f.q}>
            <summary>
              {f.q}
              <HugeiconsIcon icon={ArrowDown01Icon} size={20} aria-hidden="true" />
            </summary>
            <p>{f.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

export function Footer() {
  return (
    <footer className="qo-footer">
      <p className="qo-disclaimer">
        <strong>Disclaimer:</strong> Quest Codes is an independent third-party platform and is not
        affiliated with, associated with, endorsed by, or officially connected to SportyBet or any
        of its subsidiaries or partners. SportyBet is a trademark of its respective owner; references
        to SportyBet are for identification and compatibility purposes only.
      </p>
      <p className="qo-disclaimer">
        Quest Codes never places bets or handles your betting funds. Gambling involves risk. Must be
        of legal age in your jurisdiction. If gambling is a problem, seek help.
      </p>
      <p className="qo-copy">© 2026 Quest Codes. All rights reserved.</p>
    </footer>
  );
}
