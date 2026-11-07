import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowUpRight01Icon, InformationCircleIcon } from "@hugeicons/core-free-icons";
import { CopyButton } from "@/components/dashboard/copy-button";
import { formatOdds } from "@/lib/format";
import { TIERS, type SportyCode, type Tier } from "@/lib/sporty/schemas";

const TIER_INFO: Record<Tier, { name: string; blurb: string; className: string }> = {
  rookie: { name: "Rookie", blurb: "Small, steady picks", className: "is-rookie" },
  hustler: { name: "Hustler", blurb: "Balanced picks", className: "is-hustler" },
  high_roller: { name: "High Roller", blurb: "Bigger odds, bigger swing", className: "is-roller" },
  legend: { name: "Legend", blurb: "Maximum odds, long shot", className: "is-legend" },
};

/** Football slips are tiered. Anything without a tier (cached or older responses) is shown as a plain list. */
export const isTiered = (codes: SportyCode[]) => codes.some((c) => c.tier);

export function FootballTiers({ codes }: { codes: SportyCode[] }) {
  return (
    <>
      <div className="qo-tiers">
        {TIERS.map((tier) => {
          const info = TIER_INFO[tier];
          // Pick by tier, never by position: codes[0] is not "the" football code.
          const c = codes.find((x) => x.tier === tier);
          const name = c?.tierName ?? info.name;

          if (!c) {
            return (
              <article className="qo-tier-empty" key={tier}>
                <strong>{name}</strong>
                <span>{name} isn&apos;t available right now. Check back soon.</span>
              </article>
            );
          }

          return (
            <article className={`qo-code-card qo-tier ${info.className}`} key={tier}>
              <div className="qo-code-main">
                <span className="qo-tier-head">
                  <span className="qo-code-label">{name}</span>
                  {c.highRisk && <span className="qo-tier-boost">Big win potential</span>}
                </span>
                <strong className="qo-code-value">{c.code}</strong>
                <span className="qo-code-meta">
                  @{formatOdds(c.odds)} · {c.legsCount} legs
                </span>
                <span className="qo-tier-blurb">{info.blurb}</span>
              </div>
              <div className="qo-code-actions">
                <CopyButton value={c.code} />
                <a href={c.url} target="_blank" rel="noopener noreferrer" className="qo-btn-ghost">
                  Open on SportyBet
                  <HugeiconsIcon icon={ArrowUpRight01Icon} size={16} aria-hidden="true" />
                </a>
              </div>
            </article>
          );
        })}
      </div>
      <p className="qo-fine qo-tier-note">Picks are not guaranteed. Bet responsibly.</p>
    </>
  );
}

/** Calm "nothing safe right now" state: a normal outcome, not an error. Shows only the message. */
export function NoSafeSlip({ message }: { message?: string }) {
  return (
    <div className="qo-card qo-notice" role="status">
      <HugeiconsIcon icon={InformationCircleIcon} size={20} aria-hidden="true" />
      <div>
        <p>{message ?? "No safe slip right now."}</p>
        <p className="qo-fine">
          Our system only releases picks that meet its safety checks. Try again in a little while.
        </p>
      </div>
    </div>
  );
}
