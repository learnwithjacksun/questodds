import { Suspense } from "react";
import type { Metadata } from "next";
import { TelegramLogo } from "@/components/telegram/logo";
import { AccessCard } from "@/components/dashboard/access-card";
import { Upgrade } from "@/components/dashboard/upgrade";
import { Locked, PageHead, Skeleton } from "@/components/dashboard/ui";
import { requireUser, type CurrentUser } from "@/lib/auth/current-user";
import { getAccess } from "@/lib/access";

export const metadata: Metadata = { title: "Upgrade – Quest Codes" };

/** Waits on the subscription lookup, so the heading above renders immediately. */
async function UpgradeBody({ user }: { user: CurrentUser }) {
  const access = await getAccess(user);

  if (!access.linked) {
    return (
      <Locked
        icon={<TelegramLogo size={24} />}
        title="Link your Telegram first"
        body="Payments are credited to your Telegram account so both platforms unlock together."
        href="/dashboard/settings"
        cta="Link Telegram"
      />
    );
  }
  return (
    <>
      <AccessCard access={access} hideAction />
      <section className="qo-dash-section">
        <Upgrade active={access.allowed} baselineExpiresAt={access.expiresAt} />
      </section>
    </>
  );
}

export default async function UpgradePage() {
  const user = await requireUser();

  return (
    <>
      <PageHead title="Upgrade to" accent="VIP">
        One plan covers the website and the Telegram bot. Pay by bank transfer, no card needed.
      </PageHead>
      <Suspense fallback={<Skeleton height={320} />}>
        <UpgradeBody user={user} />
      </Suspense>
    </>
  );
}
