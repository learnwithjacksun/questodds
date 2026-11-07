import { Suspense } from "react";
import Link from "next/link";
import { PageHead, Skeleton, StatTile } from "@/components/dashboard/ui";
import { getOverview } from "@/lib/admin/queries";
import { requireAdmin } from "@/lib/auth/require-admin";
import { formatNaira } from "@/lib/plan";
import { sportName } from "@/lib/sporty/sports";

const pct = (part: number, whole: number) => (whole === 0 ? "—" : `${Math.round((part / whole) * 100)}%`);

async function OverviewBody() {
  await requireAdmin();
  const o = await getOverview();
  const max = Math.max(1, ...o.signups.byDay.map((d) => d.count));
  const alerts = o.payments.stuck + o.payments.mismatched;

  return (
    <>
      {alerts > 0 && (
        <div className="qo-card qo-notice" role="status">
          <p>
            {o.payments.stuck > 0 && (
              <>
                <strong>{o.payments.stuck}</strong> payment{o.payments.stuck === 1 ? "" : "s"} started over 30
                minutes ago and not confirmed.{" "}
              </>
            )}
            {o.payments.mismatched > 0 && (
              <>
                <strong>{o.payments.mismatched}</strong> checkout{o.payments.mismatched === 1 ? "" : "s"} quoted a
                different amount than the plan price.{" "}
              </>
            )}
            <Link href="/admin/payments">Review payments</Link>
          </p>
        </div>
      )}

      <section className="qo-dash-section">
        <h2>Users</h2>
        <div className="qo-dash-grid qo-grid-4">
          <StatTile label="Total users" value={o.users.total} hint={`${o.signups.today} today`} />
          <StatTile label="New this week" value={o.signups.week} hint={`${o.signups.month} in 30 days`} />
          <StatTile
            label="Telegram linked"
            value={pct(o.users.linked, o.users.total)}
            hint={`${o.users.total - o.users.linked} can't use VIP yet`}
          />
          <StatTile label="Email verified" value={pct(o.users.verified, o.users.total)} hint={`${o.users.suspended} suspended`} />
        </div>
      </section>

      <section className="qo-dash-section">
        <h2>Signups, last 14 days</h2>
        <div className="qo-card">
          <div className="qo-bars" role="img" aria-label={`Daily signups for the last 14 days, highest ${max}`}>
            {o.signups.byDay.map((d) => (
              <div key={d.day} className="qo-bar" title={`${d.day}: ${d.count}`}>
                <span style={{ height: `${Math.max(4, (d.count / max) * 100)}%` }} />
                <small>{d.day.slice(8)}</small>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="qo-dash-section">
        <h2>VIP and revenue</h2>
        <div className="qo-dash-grid qo-grid-4">
          <StatTile label="VIP now" value={o.vip.active} hint="As of each user's last visit" />
          <StatTile label="Expiring in 3 days" value={o.vip.expiringSoon} hint="Renewal chance" />
          <StatTile label="Revenue, 7 days" value={formatNaira(o.payments.revenueWeek)} hint={`${o.payments.paidWeek} website payments`} />
          <StatTile label="Revenue, 30 days" value={formatNaira(o.payments.revenueMonth)} hint={`${o.payments.paidMonth} website payments`} />
        </div>
        <p className="qo-fine">
          Website payments only. Payments made inside the Telegram bot don&apos;t pass through here.
        </p>
      </section>

      <section className="qo-dash-section">
        <h2>Usage</h2>
        <div className="qo-dash-grid qo-grid-4">
          <StatTile label="Runs today" value={o.usage.today} hint={`${o.usage.failedToday} failed`} />
          <StatTile
            label="Avg response"
            value={o.usage.avgLatencyMs === null ? "—" : `${(o.usage.avgLatencyMs / 1000).toFixed(1)}s`}
            hint="Code generation, last 7 days"
          />
          <div className="qo-card qo-span-2">
            <span className="qo-stat-label">By service, 7 days</span>
            {o.usage.byService.length === 0 ? (
              <p className="qo-empty">No runs recorded yet.</p>
            ) : (
              <ul className="qo-admin-list">
                {o.usage.byService.map((s) => (
                  <li key={s.service}>
                    <span>{sportName(s.service)}</span>
                    <strong>{s.count}</strong>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>
    </>
  );
}

export default function AdminOverviewPage() {
  return (
    <>
      <PageHead title="Admin" accent="overview">
        Users, payments and usage at a glance.
      </PageHead>
      <Suspense fallback={<Skeleton height={360} />}>
        <OverviewBody />
      </Suspense>
    </>
  );
}
