import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowUpRight01Icon } from "@hugeicons/core-free-icons";
import { AccessCard } from "@/components/dashboard/access-card";
import { ProofFeed, UserStatsTiles } from "@/components/dashboard/stats";
import { PageHead, Skeleton } from "@/components/dashboard/ui";
import { requireUser, type CurrentUser } from "@/lib/auth/current-user";
import { getAccess } from "@/lib/access";
import { SPORTS } from "@/lib/sporty/schemas";
import { QUEST_SPECIAL, SPORT_META } from "@/lib/sporty/sports";

export const metadata: Metadata = { title: "Dashboard – Quest Codes" };

/** Waits on the subscription lookup, so it streams in after the rest of the page. */
async function AccessSection({ user }: { user: CurrentUser }) {
  return <AccessCard access={await getAccess(user)} />;
}

export default async function OverviewPage() {
  const user = await requireUser();

  return (
    <>
      <PageHead title="Hi," accent={user.username}>
        Generate booking codes, track how they do, and manage your subscription.
      </PageHead>

      <Suspense fallback={<Skeleton height={104} />}>
        <AccessSection user={user} />
      </Suspense>

      <section className="qo-dash-section">
        <h2>Generate</h2>
        <div className="qo-dash-grid qo-grid-3">
          {SPORTS.map((s) => (
            <Link key={s} href={`/dashboard/generate?sport=${s}`} className="qo-card qo-link-card">
              <span className="qo-icon-badge" aria-hidden="true">
                <HugeiconsIcon icon={SPORT_META[s].icon} size={22} />
              </span>
              <h3>{SPORT_META[s].name}</h3>
              <p>{SPORT_META[s].blurb}</p>
              <HugeiconsIcon icon={ArrowUpRight01Icon} size={18} className="qo-link-card-arrow" aria-hidden="true" />
            </Link>
          ))}
        </div>
        <Link
          href={`/dashboard/generate?sport=${QUEST_SPECIAL.id}`}
          className="qo-card qo-link-card qo-link-card-wide"
        >
          <span className="qo-icon-badge" aria-hidden="true">
            <HugeiconsIcon icon={QUEST_SPECIAL.icon} size={22} />
          </span>
          <h3>{QUEST_SPECIAL.name}</h3>
          <p>{QUEST_SPECIAL.blurb}</p>
          <HugeiconsIcon icon={ArrowUpRight01Icon} size={18} className="qo-link-card-arrow" aria-hidden="true" />
        </Link>
      </section>

      {user.telegram && (
        <section className="qo-dash-section">
          <h2>Your stats</h2>
          <Suspense fallback={<Skeleton height={110} />}>
            <UserStatsTiles telegramId={user.telegram.id} />
          </Suspense>
        </section>
      )}

      <Suspense fallback={<Skeleton height={260} />}>
        <ProofFeed />
      </Suspense>
    </>
  );
}
