import { HugeiconsIcon } from "@hugeicons/react";
import { boomRatePercent, hasReliableRate, settledCount, type Tally } from "@/lib/sporty/stats";
import { QUEST_SPECIAL } from "@/lib/sporty/sports";

function rate(tally: Tally): string {
  const r = boomRatePercent(tally);
  return r === null ? "—" : `${r}%`;
}

/** Quest Special's own tally. Community figures stay hidden until enough slips have settled. */
export function QuestSpecialCard({ tally, community = false }: { tally: Tally; community?: boolean }) {
  const showRate = community ? hasReliableRate(tally) : settledCount(tally) > 0;
  return (
    <div className="qo-card qo-qs">
      <div className="qo-qs-title">
        <span className="qo-icon-badge" aria-hidden="true">
          <HugeiconsIcon icon={QUEST_SPECIAL.icon} size={22} />
        </span>
        <div>
          <h3>{QUEST_SPECIAL.name}</h3>
          <p>{community ? "All users" : "Your live codes"}</p>
        </div>
      </div>
      <dl className="qo-qs-stats">
        <div>
          <dt>Signals</dt>
          <dd>{tally.total}</dd>
        </div>
        <div>
          <dt>Won</dt>
          <dd>{tally.boomed}</dd>
        </div>
        <div>
          <dt>Lost</dt>
          <dd>{tally.lost}</dd>
        </div>
        <div>
          <dt>Win rate</dt>
          <dd>{showRate ? rate(tally) : "—"}</dd>
        </div>
      </dl>
    </div>
  );
}
