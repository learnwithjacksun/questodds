import { Suspense } from "react";
import { PageHead, Skeleton } from "@/components/dashboard/ui";
import { connectDB } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/require-admin";
import { formatWhen } from "@/lib/format";
import { AuditLog } from "@/lib/models/audit-log";

async function AuditBody() {
  await requireAdmin();
  await connectDB();
  const entries = await AuditLog.find().sort({ at: -1 }).limit(200).lean();

  return (
    <div className="qo-card qo-card-flush">
      <h3>Latest 200 entries</h3>
      {entries.length === 0 ? (
        <p className="qo-empty">No admin activity yet.</p>
      ) : (
        <div className="qo-table-wrap">
          <table className="qo-table">
            <thead>
              <tr>
                <th>When</th>
                <th>Who</th>
                <th>Action</th>
                <th>Target</th>
                <th>IP</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={String(e._id)}>
                  <td>{formatWhen(e.at.toISOString())}</td>
                  <td>{e.actorName ?? "—"}</td>
                  <td className="qo-mono">{e.action}</td>
                  <td className="qo-mono">{e.targetId ? e.targetId.slice(-8) : "—"}</td>
                  <td className="qo-mono">{e.ip ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function AdminAuditPage() {
  return (
    <>
      <PageHead title="Audit" accent="log">
        Every admin sign-in and every change made to a user. Entries can&apos;t be edited or deleted from the app.
      </PageHead>
      <Suspense fallback={<Skeleton height={420} />}>
        <AuditBody />
      </Suspense>
    </>
  );
}
