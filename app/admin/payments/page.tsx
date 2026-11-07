import { Suspense } from "react";
import Link from "next/link";
import { ReverifyButton } from "@/components/admin/reverify-button";
import { PageHead, Skeleton } from "@/components/dashboard/ui";
import { connectDB } from "@/lib/db";
import { nowMs } from "@/lib/admin/time";
import { requireAdmin } from "@/lib/auth/require-admin";
import { formatWhen } from "@/lib/format";
import { formatNaira } from "@/lib/plan";
import { Payment } from "@/lib/models/payment";
import { User } from "@/lib/models/user";

async function PaymentsBody() {
  await requireAdmin();
  await connectDB();

  const payments = await Payment.find().sort({ createdAt: -1 }).limit(100).lean();
  const users = await User.find({ _id: { $in: [...new Set(payments.map((p) => p.userId))] } })
    .select("username")
    .lean();
  const names = new Map(users.map((u) => [String(u._id), u.username]));
  const stuckBefore = nowMs() - 30 * 60 * 1000;

  return (
    <div className="qo-card qo-card-flush">
      <h3>Latest 100 website checkouts</h3>
      {payments.length === 0 ? (
        <p className="qo-empty">No checkouts recorded yet. They appear as users start paying.</p>
      ) : (
        <div className="qo-table-wrap">
          <table className="qo-table">
            <thead>
              <tr>
                <th>Reference</th>
                <th>User</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Started</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => {
                const stuck = p.status === "initiated" && p.createdAt.getTime() < stuckBefore;
                const mismatch = p.quotedAmount !== undefined && p.quotedAmount !== p.expectedAmount;
                return (
                  <tr key={p.reference}>
                    <td className="qo-mono">{p.reference}</td>
                    <td>
                      <Link href={`/admin/users/${p.userId}`} className="qo-admin-link">
                        {names.get(p.userId) ?? "deleted user"}
                      </Link>
                    </td>
                    <td>
                      {formatNaira(p.quotedAmount ?? p.expectedAmount)}
                      {mismatch && <span className="qo-badge is-lost"> Plan {formatNaira(p.expectedAmount)}</span>}
                    </td>
                    <td>
                      <span className={`qo-badge ${p.status === "paid" ? "is-boomed" : stuck ? "is-lost" : "is-pending"}`}>
                        {p.status === "paid" ? "Paid" : stuck ? "Not confirmed" : "Waiting"}
                      </span>
                    </td>
                    <td>{formatWhen(p.createdAt.toISOString())}</td>
                    <td>{p.status !== "paid" && <ReverifyButton reference={p.reference} />}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function AdminPaymentsPage() {
  return (
    <>
      <PageHead title="Website" accent="payments">
        Checkouts started on the site. Payments made in the Telegram bot aren&apos;t listed. A payment is
        marked paid when the user&apos;s browser sees it confirmed, so a row can stay &quot;Waiting&quot; or
        &quot;Not confirmed&quot; if they paid and closed the page. Press Re-verify to check it with the payment
        service and update the record.
      </PageHead>
      <Suspense fallback={<Skeleton height={420} />}>
        <PaymentsBody />
      </Suspense>
    </>
  );
}
