import { cacheLife } from "next/cache";
import { getGlobalStats } from "@/lib/sporty/client";
import { boomRatePercent, hasReliableRate, settledCount } from "@/lib/sporty/stats";

async function loadStats() {
  "use cache";
  cacheLife("minutes");
  try {
    return await getGlobalStats();
  } catch {
    return null;
  }
}

/**
 * Real tracked results from the service. Renders nothing until enough slips have settled, because
 * the tracker reports a placeholder rate when it has no data and a landing page must not show that.
 */
export async function Proof() {
  const stats = await loadStats();
  if (!stats || !hasReliableRate(stats)) return null;

  const rate = boomRatePercent(stats);
  return (
    <section id="results" className="qo-section">
      <h2 className="qo-h2">Tracked results</h2>
      <div className="qo-grid">
        <article className="qo-card">
          <h3>{stats.totalSlips}</h3>
          <p>Slips generated and tracked</p>
        </article>
        <article className="qo-card">
          <h3>{settledCount(stats)}</h3>
          <p>Slips settled so far</p>
        </article>
        <article className="qo-card">
          <h3>{rate}%</h3>
          <p>Of settled slips won</p>
        </article>
      </div>
      <p className="qo-proof-note">
        Figures come from Quest Codes&apos; own tracker and are not independently audited. Past results
        don&apos;t guarantee future results.
      </p>
    </section>
  );
}
