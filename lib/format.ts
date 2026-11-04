const WHEN = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "UTC",
});
const DAY = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeZone: "UTC" });

/** "4 Nov, 15:54 UTC". Fixed timezone so server and client render the same text. */
export function formatWhen(iso: string | undefined | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : `${WHEN.format(d)} UTC`;
}

export function formatDay(date: Date): string {
  return DAY.format(date);
}

export function formatOdds(odds: number | undefined): string {
  return odds === undefined ? "—" : odds.toFixed(2);
}
