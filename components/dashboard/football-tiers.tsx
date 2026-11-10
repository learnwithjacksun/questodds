import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowUpRight01Icon,
  InformationCircleIcon,
} from "@hugeicons/core-free-icons";
import { CopyButton } from "@/components/dashboard/copy-button";
import { formatOdds } from "@/lib/format";
import { TIERS, type SportyCode, type Tier } from "@/lib/sporty/schemas";
import { STATS_VERIFIED_LEAGUES } from "@/lib/sporty/sports";

const TIER_INFO: Record<Tier, { name: string; blurb: string; className: string; over: boolean }> = {
  rookie: { name: "Rookie", blurb: "Small, steady picks", className: "is-rookie", over: false },
  hustler: { name: "Hustler", blurb: "Balanced picks", className: "is-hustler", over: false },
  high_roller: { name: "High Roller", blurb: "Bigger odds, bigger swing", className: "is-roller", over: true },
  legend: { name: "Legend", blurb: "Maximum odds, long shot", className: "is-legend", over: true },
};

const VERIFIED_TIP = "At least one match in this code was checked against live team stats.";

/** Football slips are tiered. Anything without a tier (cached or older responses) is shown as a plain list. */
export const isTiered = (codes: SportyCode[]) => codes.some((c) => c.tier);

/** Shown only when the code says so. Missing or false means no badge. */
export function StatsVerifiedBadge({ code }: { code: Pick<SportyCode, "statsVerified"> }) {
  if (code.statsVerified !== true) return null;
  return (
    <span className="qo-verified" title={VERIFIED_TIP} aria-label={`Stats verified. ${VERIFIED_TIP}`}>
      Stats verified
    </span>
  );
}

/** Which leagues get the extra stats check. Never claims these are the only leagues used. */
export function StatsVerifiedLeagues() {
  return (
    <section className="qo-leagues" aria-label="Stats-verified leagues">
      <h4>Stats-verified leagues</h4>
      <ul>
        {STATS_VERIFIED_LEAGUES.map((l) => (
          <li key={l.name}>
            {l.name} <span>({l.country})</span>
          </li>
        ))}
      </ul>
      <p>
        Our football picks scan every upcoming match. Matches in these five leagues are additionally
        checked against live team stats.
      </p>
    </section>
  );
}

/** The service's own "<Tier>: not available right now" line for this tier, if it sent one. */
function missingText(name: string, lines?: string[]): string {
  const line = lines?.find((l) => l.toLowerCase().startsWith(`${name.toLowerCase()}:`));
  return line ?? `${name} is not available right now`;
}

export function FootballTiers({ codes, lines }: { codes: SportyCode[]; lines?: string[] }) {
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
                <span>{missingText(name, lines)}</span>
              </article>
            );
          }

          return (
            <article className={`qo-code-card qo-tier ${info.className}`} key={tier}>
              <div className="qo-code-main">
                <span className="qo-tier-head">
                  <span className="qo-code-label">{name}</span>
                  {c.highRisk && <span className="qo-tier-boost">Higher risk</span>}
                  <StatsVerifiedBadge code={c} />
                </span>
                <strong className="qo-code-value">{c.code}</strong>
                <span className="qo-code-meta">
                  @{formatOdds(c.odds)} · {c.legsCount} legs
                </span>
                <span className="qo-tier-blurb">{info.blurb}</span>
                {info.over && (
                  <span className="qo-tier-blurb">
                    May include Over 0.5 / Over 1.5 picks when team stats back them.
                  </span>
                )}
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
      <p className="qo-fine qo-tier-note">Picks are estimates and not guaranteed. Legend is a long shot.</p>
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
