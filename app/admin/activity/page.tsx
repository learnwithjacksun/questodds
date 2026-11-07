import { Suspense } from "react";
import Link from "next/link";
import { PageHead, Skeleton } from "@/components/dashboard/ui";
import { connectDB } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/require-admin";
import { formatWhen } from "@/lib/format";
import { Generation } from "@/lib/models/generation";
import { User } from "@/lib/models/user";
import { sportName } from "@/lib/sporty/sports";

async function ActivityBody() {
  await requireAdmin();
  await connectDB();

  const runs = await Generation.find().sort({ at: -1 }).limit(100).lean();
  const users = await User.find({ _id: { $in: [...new Set(runs.map((r) => r.userId))] } })
    .select("username")
    .lean();
  const names = new Map(users.map((u) => [String(u._id), u.username]));

  return (
    <div className="qo-card qo-card-flush">
      <h3>Latest 100 runs</h3>
      {runs.length === 0 ? (
        <p className="qo-empty">Nothing recorded yet. Runs appear as VIP users generate codes.</p>
      ) : (
        <div className="qo-table-wrap">
          <table className="qo-table">
            <thead>
              <tr>
                <th>User</th>
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
                  <td>
                    <Link href={`/admin/users/${r.userId}`} className="qo-admin-link">
                      {names.get(r.userId) ?? "deleted user"}
                    </Link>
                  </td>
                  <td>{sportName(r.service)}</td>
                  <td>
                    <span className={`qo-badge ${r.ok ? "is-boomed" : "is-lost"}`} title={r.error ?? undefined}>
                      {r.ok ? "OK" : "Failed"}
                    </span>
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
  );
}

export default function AdminActivityPage() {
  return (
    <>
      <PageHead title="Recent" accent="activity">
        Code generation and Quest Special runs across all users.
      </PageHead>
      <Suspense fallback={<Skeleton height={420} />}>
        <ActivityBody />
      </Suspense>
    </>
  );
}
