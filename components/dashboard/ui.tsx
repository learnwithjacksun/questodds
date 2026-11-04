import Link from "next/link";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import { Alert02Icon } from "@hugeicons/core-free-icons";
import { formatOdds, formatWhen } from "@/lib/format";
import { sportName } from "@/lib/sporty/sports";
import type { SlipStatus } from "@/lib/sporty/schemas";

/** Page title in the landing style: tight tracking with a serif-italic accent word. */
export function PageHead({
  title,
  accent,
  children,
}: {
  title: string;
  accent?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="qo-dash-head">
      <h1>
        {title} {accent && <span className="qo-serif">{accent}</span>}
      </h1>
      {children && <p>{children}</p>}
    </div>
  );
}

/** Card explaining what's missing (Telegram link, subscription) with one call to action. */
export function Locked({
  icon,
  title,
  body,
  href,
  cta,
}: {
  icon: IconSvgElement;
  title: string;
  body: string;
  href: string;
  cta: string;
}) {
  return (
    <div className="qo-card qo-locked">
      <span className="qo-icon-badge" aria-hidden="true">
        <HugeiconsIcon icon={icon} size={22} />
      </span>
      <h3>{title}</h3>
      <p>{body}</p>
      <Link href={href} className="qo-btn-primary qo-btn-sm">
        {cta}
      </Link>
    </div>
  );
}

/** Inline notice when the external service can't be reached; the rest of the page still works. */
export function Unavailable({ what }: { what: string }) {
  return (
    <div className="qo-card qo-notice" role="status">
      <HugeiconsIcon icon={Alert02Icon} size={20} aria-hidden="true" />
      <p>{what} is unavailable right now. The service may be waking up, so try again in a minute.</p>
    </div>
  );
}

export function StatTile({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return (
    <div className="qo-card qo-stat">
      <span className="qo-stat-label">{label}</span>
      <strong className="qo-stat-value">{value}</strong>
      {hint && <span className="qo-stat-hint">{hint}</span>}
    </div>
  );
}

const STATUS_LABEL: Record<SlipStatus, string> = { boomed: "Won", lost: "Lost", pending: "Pending" };

export function StatusBadge({ status }: { status: SlipStatus }) {
  return <span className={`qo-badge is-${status}`}>{STATUS_LABEL[status]}</span>;
}

export type SlipRow = {
  code: string;
  sport?: string;
  odds?: number;
  legs?: number;
  status?: SlipStatus;
  at?: string;
};

export function SlipsTable({ rows, empty }: { rows: SlipRow[]; empty: string }) {
  if (rows.length === 0) return <p className="qo-empty">{empty}</p>;
  return (
    <div className="qo-table-wrap">
      <table className="qo-table">
        <thead>
          <tr>
            <th>Code</th>
            <th>Service</th>
            <th>Odds</th>
            <th>Legs</th>
            <th>Status</th>
            <th>When</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={`${r.code}-${i}`}>
              <td className="qo-mono">{r.code}</td>
              <td>{r.sport ? sportName(r.sport) : "—"}</td>
              <td>{formatOdds(r.odds)}</td>
              <td>{r.legs ?? "—"}</td>
              <td>{r.status ? <StatusBadge status={r.status} /> : "—"}</td>
              <td>{formatWhen(r.at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Skeleton({ height = 120 }: { height?: number }) {
  return <div className="qo-skel" style={{ height }} aria-hidden="true" />;
}
