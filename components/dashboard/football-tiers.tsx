"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowUpRight01Icon, InformationCircleIcon } from "@hugeicons/core-free-icons";
import { CopyButton } from "@/components/dashboard/copy-button";
import { formatOdds } from "@/lib/format";
import type { GenerateResult, SportyCode, Tier } from "@/lib/sporty/schemas";
import { FOOTBALL_TIERS, STATS_VERIFIED_LEAGUES } from "@/lib/sporty/sports";

const VERIFIED_TIP = "At least one match in this code was checked against live team stats.";
const LONG_SHOT_LINE =
  "Built from the safest picks available, but odds this high rarely win. Stake only what you can afford to lose.";

/** Visual identity per tier: a rising scale from calm to bold. Never red. */
const TIER_CLASS: Record<Tier, string> = {
  rookie: "is-rookie",
  hustler: "is-hustler",
  high_roller: "is-roller",
  legend: "is-legend",
  tycoon: "is-tycoon",
  moonshot: "is-moonshot",
};

/** Over legs only appear in these two tiers, so only they get the description line. */
const OVER_TIERS: readonly Tier[] = ["high_roller", "legend"];
/** Tycoon and Moonshot get the stake warning. */
const WARNING_TIERS: readonly Tier[] = ["tycoon", "moonshot"];

export const tierName = (tier: Tier): string => FOOTBALL_TIERS.find((t) => t.slug === tier)?.name ?? tier;

/**
 * One tier's result out of an "All tiers" response. A tier with no code is simply unavailable:
 * the backend doesn't list missing tiers when something was built, so we work that out here.
 */
export function deriveTierResult(raw: GenerateResult, tier: Tier): GenerateResult {
  if (!raw.success) return raw;
  const code = raw.codes.find((c) => c.tier === tier);
  return code
    ? { ...raw, count: 1, codes: [code], lines: undefined, noSafeSlip: undefined, requestedTiers: [tier] }
    : { success: false, sport: "football", count: 0, requestedTiers: [tier] };
}

/** Calm "not available" state: a normal outcome, never an error. Only the service's message, never reasons or numbers. */
function Unavailable({ title, message, brief = false }: { title: string; message?: string; brief?: boolean }) {
  return (
    <div className="qo-card qo-notice" role="status">
      <HugeiconsIcon icon={InformationCircleIcon} size={20} aria-hidden="true" />
      <div>
        <p>
          <strong>{title}</strong>
        </p>
        {!brief && message && <p className="qo-fine">{message}</p>}
        {!brief && (
          <p className="qo-fine">
            Long-shot tiers need many suitable matches. Try again later or choose another tier.
          </p>
        )}
      </div>
    </div>
  );
}

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

/** Six tier cards, one selected at a time. Picking one starts (or shows) that tier's run. */
export function TierPicker({
  selected,
  allSelected,
  disabled,
  generated,
  allGenerated,
  onSelect,
  onAll,
}: {
  /** The selected tier, or null while the "All tiers" view is selected. */
  selected: Tier | null;
  allSelected: boolean;
  disabled: boolean;
  /** Tiers that already have a result this session. */
  generated: ReadonlySet<Tier>;
  allGenerated: boolean;
  onSelect: (tier: Tier) => void;
  onAll: () => void;
}) {
  return (
    <div className="qo-tierpick" role="radiogroup" aria-label="Football tier">
      {FOOTBALL_TIERS.map((t) => {
        const isSelected = t.slug === selected;
        return (
          <button
            key={t.slug}
            type="button"
            role="radio"
            aria-checked={isSelected}
            disabled={disabled}
            className={`qo-tierpick-card ${TIER_CLASS[t.slug]}${isSelected ? " is-selected" : ""}`}
            onClick={() => onSelect(t.slug)}
          >
            <span className="qo-tierpick-top">
              <strong>{t.name}</strong>
              {t.highRisk && <span className="qo-tier-boost">Long shot</span>}
            </span>
            <span className="qo-tierpick-blurb">{t.blurb}</span>
            <span className="qo-tierpick-hint">
              {t.oddsHint} · {t.legsHint}
            </span>
            {WARNING_TIERS.includes(t.slug) && <span className="qo-tierpick-warn">{LONG_SHOT_LINE}</span>}
            {generated.has(t.slug) && !isSelected && <span className="qo-tierpick-done">Generated</span>}
          </button>
        );
      })}
      <button
        type="button"
        role="radio"
        aria-checked={allSelected}
        disabled={disabled}
        className={`qo-tierpick-all${allSelected ? " is-selected" : ""}`}
        onClick={onAll}
      >
        <strong>All tiers (slower)</strong>
        <span>Builds every tier in one run. It can take up to 3 minutes.</span>
        {allGenerated && !allSelected && <span className="qo-tierpick-done">Generated</span>}
      </button>
    </div>
  );
}

/** The requested tier's result. Picks the code by tier, never by position. */
export function TierResult({
  tier,
  result,
  onAgain,
  compact = false,
}: {
  tier: Tier;
  result: GenerateResult;
  onAgain: () => void;
  /** Inside the "All tiers" view: no per-tier "Generate again" or cached note. */
  compact?: boolean;
}) {
  const name = tierName(tier);
  const code = result.success ? result.codes.find((c) => c.tier === tier) : undefined;

  if (!code) {
    return (
      <Unavailable
        title={`${name} is not available right now.`}
        message={!result.success ? result.message : undefined}
        brief={compact}
      />
    );
  }

  const cached = result.success && result.cached === true;
  return (
    <>
      <div className="qo-results-head">
        <h2>{code.tierName ?? name}</h2>
        {!compact && cached && <span className="qo-fine qo-just">Just generated</span>}
        {!compact && (
          <button type="button" className="qo-text-btn" onClick={onAgain}>
            Generate again
          </button>
        )}
      </div>
      <article className={`qo-code-card qo-tier ${TIER_CLASS[tier]}`}>
        <div className="qo-code-main">
          <span className="qo-tier-head">
            <span className="qo-code-label">{code.tierName ?? name}</span>
            {code.highRisk && <span className="qo-tier-boost">Long shot</span>}
            <StatsVerifiedBadge code={code} />
          </span>
          <strong className="qo-code-value">{code.code}</strong>
          <span className="qo-code-meta">
            @{formatOdds(code.odds)} · {code.legsCount} legs
          </span>
          {OVER_TIERS.includes(tier) && (
            <span className="qo-tier-blurb">
              May include Over 0.5 / Over 1.5 picks when team stats back them.
            </span>
          )}
          {WARNING_TIERS.includes(tier) && <span className="qo-tier-blurb">{LONG_SHOT_LINE}</span>}
        </div>
        <div className="qo-code-actions">
          <CopyButton value={code.code} />
          <a href={code.url} target="_blank" rel="noopener noreferrer" className="qo-btn-ghost">
            Open on SportyBet
            <HugeiconsIcon icon={ArrowUpRight01Icon} size={16} aria-hidden="true" />
          </a>
        </div>
      </article>
    </>
  );
}

/** Every tier from an "All tiers" run, in the fixed FOOTBALL_TIERS order. Missing tiers are normal. */
export function AllTiersResult({ result, onAgain }: { result: GenerateResult; onAgain: () => void }) {
  if (!result.success) {
    return (
      <>
        <Unavailable title="No tiers are available right now." message={result.message} />
        <div className="qo-results-head">
          <button type="button" className="qo-text-btn" onClick={onAgain}>
            Generate all tiers again
          </button>
        </div>
      </>
    );
  }
  return (
    <>
      <div className="qo-results-head">
        <h2>All tiers</h2>
        {result.cached === true && <span className="qo-fine qo-just">Just generated</span>}
        <button type="button" className="qo-text-btn" onClick={onAgain}>
          Generate all tiers again
        </button>
      </div>
      <div className="qo-alltiers">
        {FOOTBALL_TIERS.map((t) => (
          <section key={t.slug}>
            <TierResult tier={t.slug} result={deriveTierResult(result, t.slug)} onAgain={onAgain} compact />
          </section>
        ))}
      </div>
    </>
  );
}
