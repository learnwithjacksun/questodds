import {
  ComputerIcon,
  FootballIcon,
  GameController01Icon,
  Target01Icon,
} from "@hugeicons/core-free-icons";
import type { IconSvgElement } from "@hugeicons/react";
import type { Sport } from "@/lib/sporty/schemas";

export const SPORT_META: Record<Sport, { name: string; blurb: string; note: string; icon: IconSvgElement }> = {
  football: {
    name: "Football",
    blurb: "Upcoming fixtures scanned, ranked and grouped into booking codes.",
    note: "Odds move and codes expire. Open the code on SportyBet to check current prices.",
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

/** Quest Special isn't a normal preset: it's a live scanner with its own start/poll/stop flow. */
export const QUEST_SPECIAL = {
  id: "quest_special",
  name: "Quest Special",
  blurb: "Live vFootball scanner that mints a booking code only when a match clears its safety rules.",
  note: "Virtual football results are random. A matching rule doesn't make a code safe.",
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
