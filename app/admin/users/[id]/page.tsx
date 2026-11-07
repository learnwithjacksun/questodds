import { Suspense } from "react";
import Link from "next/link";
import { isValidObjectId } from "mongoose";
import { notFound } from "next/navigation";
import { ReceiptButton } from "@/components/admin/receipt-button";
import { ReverifyButton } from "@/components/admin/reverify-button";
import { UserActions } from "@/components/admin/user-actions";
import { RevealEmail } from "@/components/admin/reveal-email";
import { PageHead, Skeleton, StatTile } from "@/components/dashboard/ui";
import { connectDB } from "@/lib/db";
import { maskEmail } from "@/lib/admin/mask";
import { requireAdmin } from "@/lib/auth/require-admin";
import { effectiveRole } from "@/lib/auth/roles";
import { formatDay, formatWhen } from "@/lib/format";
import { formatNaira } from "@/lib/plan";
import { AuditLog } from "@/lib/models/audit-log";
import { Generation } from "@/lib/models/generation";
import { Payment } from "@/lib/models/payment";
import { User } from "@/lib/models/user";
import { getSubscription, getUserStats } from "@/lib/sporty/client";
import { sportName } from "@/lib/sporty/sports";

async function UserBody({ params }: { params: Promise<{ id: string }> }) {
  const staff = await requireAdmin();
  const { id } = await params;
  if (!isValidObjectId(id)) notFound();

  await connectDB();
  const user = await User.findById(id).lean();
  if (!user) notFound();

  const role = effectiveRole(user);
  const telegramId = user.telegramId ?? null;

  // Live lookups are on demand and independent: one failing must not hide the rest.
  const [subscription, stats, payments, runs, trail] = await Promise.all([
    getSubscription(String(user._id)).catch(() => null),
    telegramId ? getUserStats(telegramId).catch(() => null) : null,
    Payment.find({ userId: id }).sort({ createdAt: -1 }).limit(10).lean(),
    Generation.find({ userId: id }).sort({ at: -1 }).limit(10).lean(),
    AuditLog.find({ targetId: id }).sort({ at: -1 }).limit(10).lean(),
  ]);

  const isSelf = String(user._id) === staff.id;
  const canModify = !isSelf && role !== "owner" && (role !== "admin" || staff.role === "owner");

  return (
    <>
      <div className="qo-dash-grid qo-grid-3">
        <StatTile label="Status" value={user.status === "suspended" ? "Suspended" : "Active"} hint={user.suspendedReason ?? undefined} />
        <StatTile
          label="VIP"
          value={
            subscription
              ? subscription.isAdmin
                ? "Admin"
                : subscription.active
                  ? `${subscription.daysLeft} days left`
                  : "Not subscribed"
              : telegramId
                ? "Unavailable"
                : "No Telegram"
          }
          hint={subscription?.expDate ? `Ends ${subscription.expDate}` : "Live from the code service"}
        />
        <StatTile
          label="Codes won"
          value={stats ? `${stats.boomed}/${stats.boomed + stats.lost}` : "—"}
          hint={stats ? `${stats.boomRate} win rate, ${stats.pending} pending` : undefined}
        />
      </div>

      <section className="qo-dash-section">
        <h2>Account</h2>
        <div className="qo-card">
          <div className="qo-kv">
            <span>Username</span>
            <strong>{user.username}</strong>
          </div>
          <div className="qo-kv">
            <span>Email</span>
            <strong>
              <RevealEmail userId={id} masked={maskEmail(user.email)} />
            </strong>
          </div>
          <div className="qo-kv">
            <span>Role</span>
            <strong>{role}</strong>
          </div>
          <div className="qo-kv">
            <span>Telegram</span>
            <strong>
              {telegramId ? `${user.telegramUsername ? `@${user.telegramUsername} · ` : ""}${telegramId}` : "Not linked"}
            </strong>
          </div>
          <div className="qo-kv">
            <span>Joined</span>
            <strong>{formatDay(user.createdAt)}</strong>
          </div>
          <div className="qo-kv">
            <span>Email verified</span>
            <strong>{user.emailVerifiedAt ? formatDay(user.emailVerifiedAt) : "No"}</strong>
          </div>
        </div>
      </section>

      <UserActions
        userId={id}
        username={user.username}
        status={user.status === "suspended" ? "suspended" : "active"}
        hasTelegram={!!telegramId}
        note={user.adminNote ?? ""}
        canModify={canModify}
        isOwnerViewer={staff.role === "owner"}
        role={role}
      />

      <section className="qo-dash-section">
        <h2>Website payments</h2>
        <div className="qo-card qo-card-flush">
          {payments.length === 0 ? (
            <p className="qo-empty">No website payments recorded.</p>
          ) : (
            <div className="qo-table-wrap">
              <table className="qo-table">
                <thead>
                  <tr>
                    <th>Reference</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Started</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p) => (
                    <tr key={p.reference}>
                      <td className="qo-mono">{p.reference}</td>
                      <td>{formatNaira(p.quotedAmount ?? p.expectedAmount)}</td>
                      <td>
                        <span className={`qo-badge ${p.status === "paid" ? "is-boomed" : "is-pending"}`}>
                          {p.status === "paid" ? "Paid" : "Not confirmed"}
                        </span>
                      </td>
                      <td>{formatWhen(p.createdAt.toISOString())}</td>
                      <td>
                        {p.status === "paid" ? (
                          <ReceiptButton reference={p.reference} sent={!!p.receiptSentAt} />
                        ) : (
                          <ReverifyButton reference={p.reference} />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      <section className="qo-dash-section">
        <h2>Recent runs</h2>
        <div className="qo-card qo-card-flush">
          {runs.length === 0 ? (
            <p className="qo-empty">No runs recorded yet.</p>
          ) : (
            <div className="qo-table-wrap">
              <table className="qo-table">
                <thead>
                  <tr>
                    <th>Service</th>
                    <th>Result</th>
                    <th>Codes</th>
                    <th>Time</th>
                    <th>When</th>
                  </tr>
                </thead>
                <tbody>
                  {runs.map((r) => (
                    <tr key={String(r._id)}>
                      <td>{sportName(r.service)}</td>
                      <td>
                        <span className={`qo-badge ${r.ok ? "is-boomed" : "is-lost"}`}>{r.ok ? "OK" : "Failed"}</span>
                      </td>
                      <td>{r.codes}</td>
                      <td>{r.latencyMs ? `${(r.latencyMs / 1000).toFixed(1)}s` : "—"}</td>
                      <td>{formatWhen(r.at.toISOString())}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      <section className="qo-dash-section">
        <h2>Admin history</h2>
        <div className="qo-card qo-card-flush">
          {trail.length === 0 ? (
            <p className="qo-empty">Nothing yet.</p>
          ) : (
            <div className="qo-table-wrap">
              <table className="qo-table">
                <thead>
                  <tr>
                    <th>Action</th>
                    <th>By</th>
                    <th>When</th>
                  </tr>
                </thead>
                <tbody>
                  {trail.map((a) => (
                    <tr key={String(a._id)}>
                      <td className="qo-mono">{a.action}</td>
                      <td>{a.actorName ?? "—"}</td>
                      <td>{formatWhen(a.at.toISOString())}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </>
  );
}

export default async function AdminUserPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <>
      <p className="qo-admin-back">
        <Link href="/admin/users">← All users</Link>
      </p>
      <PageHead title="User" accent="detail">
        Live subscription and stats come from the code service when this page opens.
      </PageHead>
      <Suspense fallback={<Skeleton height={420} />}>
        <UserBody params={params} />
      </Suspense>
    </>
  );
}
