import { getGlobalStats, getLatestSlips, getUserStats } from "@/lib/sporty/client";
import { boomRatePercent, hasReliableRate, questSpecialTally, settledCount } from "@/lib/sporty/stats";
import { formatOdds } from "@/lib/format";
import { SPORTS, type UserStats } from "@/lib/sporty/schemas";
import { QUEST_SPECIAL, sportName } from "@/lib/sporty/sports";
import { QuestSpecialCard } from "@/components/dashboard/quest-special-card";
import { SlipsTable, StatTile, Unavailable } from "@/components/dashboard/ui";

function rate(stats: { boomed: number; lost: number }) {
  const r = boomRatePercent(stats);
  return r === null ? "—" : `${r}%`;
}

/** Personal summary tiles (overview + history). */
export async function UserStatsTiles({ telegramId }: { telegramId: string }) {
  let stats: UserStats;
  try {
    stats = await getUserStats(telegramId);
  } catch {
    return <Unavailable what="Your stats are" />;
  }

  return (
    <div className="qo-dash-grid qo-grid-4">
      <StatTile label="Slips generated" value={stats.totalSlips} />
      <StatTile
        label="Win rate"
        value={rate(stats)}
        hint={settledCount(stats) === 0 ? "No settled slips yet" : `${settledCount(stats)} settled`}
      />
      <StatTile label="Pending" value={stats.pending} />
      <StatTile
        label="Best win"
        value={stats.bestBoom ? formatOdds(stats.bestBoom.odds) : "—"}
        hint={stats.bestBoom ? stats.bestBoom.code : "Nothing yet"}
      />
      <div className="qo-span-all">
        <QuestSpecialCard tally={questSpecialTally(stats)} />
      </div>
    </div>
  );
}

/** Full history: per-service breakdown and recent slips. */
export async function HistorySection({ telegramId }: { telegramId: string }) {
  let stats: UserStats;
  try {
    stats = await getUserStats(telegramId);
  } catch {
    return <Unavailable what="Your history is" />;
  }

  const quest = questSpecialTally(stats);
  const services = [
    ...SPORTS.map((s) => ({ id: s as string, ...(stats.bySport[s] ?? { total: 0, boomed: 0, lost: 0, pending: 0 }) })),
    { id: QUEST_SPECIAL.id as string, ...quest },
  ];

  return (
    <>
      <div className="qo-dash-grid qo-grid-4">
        <StatTile label="Slips generated" value={stats.totalSlips} />
        <StatTile
          label="Win rate"
          value={rate(stats)}
          hint={settledCount(stats) === 0 ? "No settled slips yet" : `${stats.boomed} won · ${stats.lost} lost`}
        />
        <StatTile label="Pending" value={stats.pending} />
        <StatTile
          label="Best win"
          value={stats.bestBoom ? formatOdds(stats.bestBoom.odds) : "—"}
          hint={stats.bestBoom ? stats.bestBoom.code : "Nothing yet"}
        />
      </div>

      <div className="qo-dash-section">
        <QuestSpecialCard tally={quest} />
      </div>

      <section className="qo-dash-section">
        <h2>By service</h2>
        <div className="qo-table-wrap qo-card">
          <table className="qo-table">
            <thead>
              <tr>
                <th>Service</th>
                <th>Slips</th>
                <th>Won</th>
                <th>Lost</th>
                <th>Pending</th>
                <th>Win rate</th>
              </tr>
            </thead>
            <tbody>
              {services.map((s) => (
                <tr key={s.id}>
                  <td>{sportName(s.id)}</td>
                  <td>{s.total}</td>
                  <td>{s.boomed}</td>
                  <td>{s.lost}</td>
                  <td>{s.pending}</td>
                  <td>{rate(s)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="qo-dash-section">
        <h2>Recent slips</h2>
        <div className="qo-card qo-card-flush">
          <SlipsTable
            empty="Nothing generated yet. Your codes will appear here."
            rows={stats.recentSlips.map((s) => ({
              code: s.code,
              sport: s.sport,
              odds: s.odds,
              legs: s.legs,
              status: s.status,
              at: s.settledAt ?? s.createdAt,
            }))}
          />
        </div>
      </section>
    </>
  );
}

/** Community activity from the service's own tracker. */
export async function ProofFeed() {
  const [globalResult, latestResult] = await Promise.allSettled([getGlobalStats(), getLatestSlips()]);
  if (globalResult.status === "rejected" && latestResult.status === "rejected") {
    return <Unavailable what="Community activity is" />;
  }

  const global = globalResult.status === "fulfilled" ? globalResult.value : null;
  const latest = latestResult.status === "fulfilled" ? latestResult.value : [];

  return (
    <section className="qo-dash-section">
      <h2>Community activity</h2>
      {global && (
        <div className="qo-dash-grid qo-grid-4">
          <StatTile label="Slips tracked" value={global.totalSlips} />
          <StatTile label="Settled" value={settledCount(global)} />
          <StatTile label="Win rate" value={hasReliableRate(global) ? rate(global) : "—"} />
          <StatTile label="Pending" value={global.pending} />
        </div>
      )}
      {global && (
        <div className="qo-feed">
          <QuestSpecialCard tally={questSpecialTally(global)} community />
        </div>
      )}

      {latest.length > 0 && (
        <div className="qo-card qo-card-flush qo-feed">
          <h3>Latest slips</h3>
          <SlipsTable
            empty=""
            rows={latest.slice(0, 8).map((s) => ({
              code: s.code,
              sport: s.sport,
              odds: s.odds,
              legs: s.legs,
              status: s.status,
              at: s.createdAt,
            }))}
          />
        </div>
      )}
      <p className="qo-fine">Unaudited figures from our own tracker. Past results don&apos;t guarantee future ones.</p>
    </section>
  );
}
