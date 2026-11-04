import Image from "next/image";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { TelegramIcon } from "@hugeicons/core-free-icons";
import { TELEGRAM_BOT_URL } from "@/lib/links";

const LINE_COUNT = 20;

/** Instagram-style blue verification seal. */
function VerifiedBadge() {
  return (
    <svg className="qo-verified" viewBox="0 0 24 24" role="img" aria-label="Verified">
      <g fill="#0095f6">
        <rect x="3.5" y="3.5" width="17" height="17" rx="4.5" />
        <rect x="3.5" y="3.5" width="17" height="17" rx="4.5" transform="rotate(45 12 12)" />
      </g>
      <path
        d="M8 12.4l2.7 2.7L16.2 9.4"
        fill="none"
        stroke="#fff"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Hero() {
  const lines = Array.from({ length: LINE_COUNT }, (_, i) => i);

  return (
    <section className="qo-hero">
      <div className="qo-lines" aria-hidden="true">
        {lines.map((i) => (
          <span
            key={`l${i}`}
            className="qo-line qo-line-left"
            style={{ "--w": `${60 + i * 10}px`, animationDelay: `${i * 0.25}s` } as React.CSSProperties}
          />
        ))}
        {lines.map((i) => (
          <span
            key={`r${i}`}
            className="qo-line qo-line-right"
            style={{ "--w": `${60 + i * 10}px`, animationDelay: `${i * 0.25}s` } as React.CSSProperties}
          />
        ))}
        {lines.map((i) => (
          <span
            key={`t${i}`}
            className="qo-line qo-line-top"
            style={{ height: 40 + i * 10, animationDelay: `${i * 0.25}s` }}
          />
        ))}
      </div>

      <div className="qo-hero-inner">
        <div className="qo-brand-pill">
          <Image
            src="/brand/sportybet.png"
            alt=""
            width={30}
            height={30}
            className="qo-brand-logo"
          />
          SportyBet
          <VerifiedBadge />
        </div>

        <div className="qo-title-wrap">
          <h1 className="qo-title">
            Smarter booking <span className="qo-serif">codes</span>
            <sup className="qo-reg">®</sup> on demand.
          </h1>
         
        </div>

        <p className="qo-subtitle">
          Quest Codes automates SportyBet booking-code generation. Run it from your web dashboard, or
          from Telegram if you prefer. Your choice.
        </p>

        <div className="qo-cta">
          <Link href="/register" className="qo-btn-primary">
            Get started
          </Link>
          <a
            href={TELEGRAM_BOT_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="qo-btn-book w-fit"
          >
            <span className="qo-avatar">
              <HugeiconsIcon icon={TelegramIcon} size={20} />
            </span>
            <span className="qo-book-text">
              <span className="qo-book-primary">Use Telegram instead</span>
              <span className="qo-book-secondary">
                <i className="qo-dot" />
                No dashboard needed
              </span>
            </span>
          </a>
        </div>
      </div>

      <div className="qo-blur" aria-hidden="true" />
    </section>
  );
}
