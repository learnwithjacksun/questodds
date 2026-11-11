import {
  ComputerIcon,
  FootballIcon,
  GameController01Icon,
  Target01Icon,
} from "@hugeicons/core-free-icons";
import type { IconSvgElement } from "@hugeicons/react";
import type { Sport, Tier } from "@/lib/sporty/schemas";

export const SPORT_META: Record<Sport, { name: string; blurb: string; note: string; icon: IconSvgElement }> = {
  football: {
    name: "Football",
    blurb: "Pick a tier, from Rookie to Moonshot. Each run builds one tier from upcoming fixtures.",
    note: "Odds move and codes expire. Check current prices on SportyBet.",
    icon: FootballIcon,
  },
  efootball: {
    name: "eFootball",
    blurb: "Live eFootball matches filtered by score and minute.",
    note: "Live matches change fast, so use the code soon after generating it.",
    icon: GameController01Icon,
  },
  vfootball: {
    name: "vFootball",
    blurb: "Live virtual football matches filtered by score and minute.",
    note: "Virtual football results are random. No code can predict them.",
    icon: ComputerIcon,
  },
};

/**
 * The football tiers, in display order. The one place for order, copy and the long-shot flag.
 * Never describe a tier as safe, guaranteed or sure, and never show a win percentage.
 */
export const FOOTBALL_TIERS: readonly {
  slug: Tier;
  name: string;
  blurb: string;
  oddsHint: string;
  legsHint: string;
  highRisk: boolean;
}[] = [
  { slug: "rookie", name: "Rookie", blurb: "Low risk starter", oddsHint: "Low odds", legsHint: "~4 legs", highRisk: false },
  { slug: "hustler", name: "Hustler", blurb: "Balanced accumulator", oddsHint: "Mid odds", legsHint: "~8 legs", highRisk: false },
  { slug: "high_roller", name: "High Roller", blurb: "Higher payout", oddsHint: "About @10", legsHint: "More legs", highRisk: true },
  { slug: "legend", name: "Legend", blurb: "Big payout long shot", oddsHint: "@100+", legsHint: "Up to 50 legs", highRisk: true },
  { slug: "tycoon", name: "Tycoon", blurb: "Very long shot", oddsHint: "@500 to @700", legsHint: "Many legs", highRisk: true },
  { slug: "moonshot", name: "Moonshot", blurb: "Extreme long shot", oddsHint: "@700 to @1400", legsHint: "Many legs", highRisk: true },
];

/**
 * Football leagues whose matches are additionally checked against live team stats. Matches from
 * every other league are still used, just not stats-audited. Edit here when the list changes.
 */
export const STATS_VERIFIED_LEAGUES = [
  { name: "Premier League", country: "England" },
  { name: "La Liga", country: "Spain" },
  { name: "Serie A", country: "Italy" },
  { name: "Bundesliga", country: "Germany" },
  { name: "Ligue 1", country: "France" },
] as const;

/** Quest Special isn't a normal preset: it's a live scanner with its own start/poll/stop flow. */
export const QUEST_SPECIAL = {
  id: "quest_special",
  name: "Quest Special",
  blurb: "Scans live virtual matches and gives you a code when one is ready. No code means nothing safe turned up, and it isn't counted.",
  note: "Virtual football results are random.",
  icon: Target01Icon,
} as const;

/** Every selectable service on the Generate page. */
export type Service = Sport | typeof QUEST_SPECIAL.id;

export function isSport(value: string | undefined): value is Sport {
  return value === "football" || value === "efootball" || value === "vfootball";
}

export function isService(value: string | undefined): value is Service {
  return value === QUEST_SPECIAL.id || isSport(value);
}

export function sportName(value: string): string {
  if (value === QUEST_SPECIAL.id) return QUEST_SPECIAL.name;
  return isSport(value) ? SPORT_META[value].name : value;
}
