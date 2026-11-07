import { HugeiconsIcon } from "@hugeicons/react";
import { Alert02Icon, ArrowUpRight01Icon, InformationCircleIcon } from "@hugeicons/core-free-icons";
import { CopyButton } from "@/components/dashboard/copy-button";
import { formatOdds } from "@/lib/format";
import { TIERS, type NoSafeSlipTier, type SportyCode, type Tier } from "@/lib/sporty/schemas";

const TIER_INFO: Record<Tier, { name: string; blurb: string }> = {
  banker: { name: "Banker", blurb: "The safest option: handicap and double chance legs at low odds." },
  safe: { name: "Safe", blurb: "A longer slip that still has to clear the safety bar." },
  long: { name: "Long", blurb: "Around 10 odds. High risk, so the chance every leg wins is low." },
};

/** Football slips are tiered. Anything without a tier (cached or older responses) is shown as a plain list. */
export const isTiered = (codes: SportyCode[]) => codes.some((c) => c.tier);

/** "72%". Never rounds a real but tiny chance down to 0%. */
function percent(jointProb: number): string {
  const pct = jointProb * 100;
  return pct > 0 && pct < 1 ? "<1%" : `${Math.round(pct)}%`;
}

/** The reason a tier is missing, from the structured list if present, else the "<TIER>: ... (reason)" line. */
function missingReason(tier: Tier, noSafeSlip?: NoSafeSlipTier[], lines?: string[]): string | null {
  const reason = noSafeSlip?.find((n) => n.tier === tier)?.reasons[0];
  if (reason) return reason;
  const line = lines?.find((l) => l.toUpperCase().startsWith(`${tier.toUpperCase()}:`));
  const inBrackets = line?.match(/\((.+)\)\s*$/)?.[1];
  return inBrackets ?? null;
}

export function FootballTiers({
  codes,
  lines,
  noSafeSlip,
}: {
  codes: SportyCode[];
  lines?: string[];
  noSafeSlip?: NoSafeSlipTier[];
}) {
  return (
    <>
      <div className="qo-tiers">
        {TIERS.map((tier) => {
          const info = TIER_INFO[tier];
          // Pick by tier, never by position: codes[0] is not "the" football code any more.
          const c = codes.find((x) => x.tier === tier);

          if (!c) {
            const reason = missingReason(tier, noSafeSlip, lines);
            return (
              <article className="qo-tier-empty" key={tier}>
                <strong>No safe {info.name} slip right now</strong>
                <span>{reason ? `${reason[0].toUpperCase()}${reason.slice(1)}.` : "It didn't clear the safety bar."}</span>
              </article>
            );
          }

          return (
            <article className={`qo-code-card qo-tier${tier === "long" ? " is-risk" : ""}`} key={tier}>
              <div className="qo-code-main">
                <span className="qo-tier-head">
                  <span className="qo-code-label">{info.name}</span>
                  {tier === "banker" && <span className="qo-badge is-boomed">Safest</span>}
                  {tier === "long" && (
                    <span className="qo-badge is-lost">
                      <HugeiconsIcon icon={Alert02Icon} size={12} aria-hidden="true" /> High risk
                    </span>
                  )}
                </span>
                <strong className="qo-code-value">{c.code}</strong>
                <span className="qo-code-meta">
                  {formatOdds(c.odds)} odds · {c.legsCount} legs
                  {c.jointProb !== undefined && ` · ${percent(c.jointProb)} chance all legs win`}
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
      <p className="qo-fine qo-tier-note">
        <HugeiconsIcon icon={InformationCircleIcon} size={14} aria-hidden="true" /> Probabilities are
        estimates, not guarantees.
      </p>
    </>
  );
}

/** Calm "nothing safe right now" state: a normal outcome, not an error. */
export function NoSafeSlip({ message, noSafeSlip }: { message?: string; noSafeSlip: NoSafeSlipTier[] }) {
  const withReasons = noSafeSlip.filter((n) => n.reasons.length > 0);
  return (
    <div className="qo-card qo-notice" role="status">
      <HugeiconsIcon icon={InformationCircleIcon} size={20} aria-hidden="true" />
      <div>
        <p>
          {message ?? "Football: no safe slip right now."} The selector doesn&apos;t lower its safety bar, so
          try again later, when new matches and odds are in.
        </p>
        {withReasons.length > 0 && (
          <details className="qo-why">
            <summary>Why?</summary>
            <ul>
              {withReasons.map((n) => (
                <li key={n.tier}>
                  <strong>{TIER_INFO[n.tier].name}:</strong> {n.reasons.join("; ")}
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>
    </div>
  );
}
