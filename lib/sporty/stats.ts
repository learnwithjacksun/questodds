/**
 * The external tracker returns a boom rate even when no slips exist yet (e.g. "85.4%" with 0
 * slips), so a rate is only treated as real once enough slips have actually settled.
 */
export const MIN_SETTLED_FOR_RATE = 20;

export function settledCount(stats: { boomed: number; lost: number }): number {
  return stats.boomed + stats.lost;
}

export function hasReliableRate(stats: { boomed: number; lost: number }): boolean {
  return settledCount(stats) >= MIN_SETTLED_FOR_RATE;
}

/** Boom rate from our own arithmetic, never from the API's pre-formatted string. */
export function boomRatePercent(stats: { boomed: number; lost: number }): number | null {
  const settled = settledCount(stats);
  return settled === 0 ? null : Math.round((stats.boomed / settled) * 1000) / 10;
}

export type Tally = { total: number; boomed: number; lost: number; pending: number };
const EMPTY_TALLY: Tally = { total: 0, boomed: 0, lost: 0, pending: 0 };

/** Quest Special's tally from either place the API puts it (top level, or bySport.quest_special). */
export function questSpecialTally(data: { questSpecial?: Tally; bySport: Record<string, Tally> }): Tally {
  return data.questSpecial ?? data.bySport.quest_special ?? EMPTY_TALLY;
}
