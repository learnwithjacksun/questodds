import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import { TELEGRAM_BOT_URL } from "@/lib/links";
import { VIP_DAYS, VIP_PRICE_SUMMARY } from "@/lib/plan";
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
  { n: "03", icon: Coupon01Icon, title: "Get your codes", body: "With VIP active, we scan fixtures and mint booking codes. You open them on SportyBet and decide." },
];

const SERVICES: Item[] = [
  { icon: FootballIcon, title: "Football", body: "Upcoming fixtures sorted into booking codes, from steady picks to big odds." },
  { icon: GameController01Icon, title: "eFootball", body: "Live eFootball matches filtered by score and minute." },
  { icon: ComputerIcon, title: "vFootball", body: "Live virtual football matches filtered by score and minute." },
];

const FAQS: { q: string; a: string }[] = [
  {
    q: "How much does it cost?",
    a: `Creating an account is free. VIP costs ${VIP_PRICE_SUMMARY}, paid by bank transfer in naira. It's a one-time payment and doesn't renew automatically.`,
  },
  {
    q: "What happens when VIP ends?",
    a: `You keep your account, but code generation locks until you pay again. Paying before it ends adds ${VIP_DAYS} days to the time you have left.`,
  },
  {
    q: "Does Quest Codes place bets for me?",
    a: "No. It only generates booking codes. You open a code on SportyBet and choose whether to stake.",
  },
  {
    q: "Do I need Telegram?",
    a: "Not to create an account, and you can use the Telegram bot on its own. To generate codes on the web, link your Telegram account in Settings: subscriptions are tied to it, so one plan works on both the website and the bot.",
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
