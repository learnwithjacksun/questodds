import { Suspense } from "react";
import Link from "next/link";
import { PageHead, Skeleton } from "@/components/dashboard/ui";
import { maskEmail } from "@/lib/admin/mask";
import { nowMs } from "@/lib/admin/time";
import { listUsers, USER_FILTERS, type UserFilter } from "@/lib/admin/queries";
import { requireAdmin } from "@/lib/auth/require-admin";
import { effectiveRole } from "@/lib/auth/roles";
import { formatDay } from "@/lib/format";

type Search = { q?: string; filter?: string; page?: string };

const isFilter = (v: string | undefined): v is UserFilter => USER_FILTERS.some((f) => f.id === v);

function href(params: { q?: string; filter: UserFilter; page?: number }) {
  const sp = new URLSearchParams();
  if (params.q) sp.set("q", params.q);
  if (params.filter !== "all") sp.set("filter", params.filter);
  if (params.page && params.page > 1) sp.set("page", String(params.page));
  const qs = sp.toString();
  return `/admin/users${qs ? `?${qs}` : ""}`;
}

async function UsersBody({ search }: { search: Promise<Search> }) {
  await requireAdmin();
  const { q, filter: rawFilter, page: rawPage } = await search;
  const filter: UserFilter = isFilter(rawFilter) ? rawFilter : "all";
  const page = Math.max(1, Number.parseInt(rawPage ?? "1", 10) || 1);
  const { rows, total, pages } = await listUsers({ q, filter, page });
  const now = nowMs();

  return (
    <>
      <form className="qo-admin-search" action="/admin/users" role="search">
        <input
          className="qo-input"
          name="q"
          defaultValue={q ?? ""}
          placeholder="Search email, username or Telegram ID"
          aria-label="Search users"
        />
        {filter !== "all" && <input type="hidden" name="filter" value={filter} />}
        <button type="submit" className="qo-btn-primary qo-btn-sm">
          Search
        </button>
      </form>

      <div className="qo-admin-filters" role="group" aria-label="Filter users">
        {USER_FILTERS.map((f) => (
          <Link
            key={f.id}
            href={href({ q, filter: f.id })}
            className={`qo-chip${f.id === filter ? " is-active" : ""}`}
            aria-current={f.id === filter ? "true" : undefined}
          >
            {f.label}
          </Link>
        ))}
      </div>

      <div className="qo-card qo-card-flush">
        <h3>
          {total} user{total === 1 ? "" : "s"}
        </h3>
        {rows.length === 0 ? (
          <p className="qo-empty">No users match.</p>
        ) : (
          <div className="qo-table-wrap">
            <table className="qo-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Email</th>
                  <th>Telegram</th>
                  <th>VIP</th>
                  <th>Joined</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((u) => {
                  const role = effectiveRole(u);
                  const vip = u.vipUntil && u.vipUntil.getTime() > now;
                  return (
                    <tr key={String(u._id)}>
                      <td>
                        <Link href={`/admin/users/${u._id}`} className="qo-admin-link">
                          {u.username}
                        </Link>{" "}
                        {role !== "user" && <span className="qo-badge is-pending">{role}</span>}{" "}
                        {u.status === "suspended" && <span className="qo-badge is-lost">Suspended</span>}
                      </td>
                      <td>{maskEmail(u.email)}</td>
                      <td>{u.telegramId ? (u.telegramUsername ? `@${u.telegramUsername}` : u.telegramId) : "—"}</td>
                      <td>{vip ? <span className="qo-badge is-boomed">Until {formatDay(u.vipUntil!)}</span> : "—"}</td>
                      <td>{formatDay(u.createdAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {pages > 1 && (
        <nav className="qo-admin-pager" aria-label="Pages">
          {page > 1 ? (
            <Link href={href({ q, filter, page: page - 1 })} className="qo-btn-ghost qo-btn-sm">
              Previous
            </Link>
          ) : (
            <span />
          )}
          <span className="qo-fine">
            Page {page} of {pages}
          </span>
          {page < pages ? (
            <Link href={href({ q, filter, page: page + 1 })} className="qo-btn-ghost qo-btn-sm">
              Next
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </>
  );
}

export default function AdminUsersPage({ searchParams }: { searchParams: Promise<Search> }) {
  return (
    <>
      <PageHead title="All" accent="users">
        Search by email, username or Telegram ID. Emails are masked until revealed.
      </PageHead>
      <Suspense fallback={<Skeleton height={420} />}>
        <UsersBody search={searchParams} />
      </Suspense>
    </>
  );
}
