import { ComputerIcon, FootballIcon, GameController01Icon } from "@hugeicons/core-free-icons";
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

export function isSport(value: string | undefined): value is Sport {
  return value === "football" || value === "efootball" || value === "vfootball";
}

export function sportName(value: string): string {
  return isSport(value) ? SPORT_META[value].name : value;
}
