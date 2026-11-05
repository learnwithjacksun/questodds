import { Suspense } from "react";
import type { Metadata } from "next";
import { HugeiconsIcon } from "@hugeicons/react";
import { Alert02Icon, Crown02Icon } from "@hugeicons/core-free-icons";
import { TelegramLogo } from "@/components/telegram/logo";
import { Generator } from "@/components/dashboard/generator";
import { Locked, PageHead, Skeleton } from "@/components/dashboard/ui";
import { requireUser, type CurrentUser } from "@/lib/auth/current-user";
import { getAccess } from "@/lib/access";
import { VIP_PRICE_SUMMARY } from "@/lib/plan";
import { isService } from "@/lib/sporty/sports";

export const metadata: Metadata = { title: "Generate – Quest Codes" };

/** Waits on the subscription lookup, so the heading above renders immediately. */
async function GenerateBody({ user, sport }: { user: CurrentUser; sport?: string }) {
  const access = await getAccess(user);

  if (!access.linked) {
    return (
      <Locked
        icon={<TelegramLogo size={24} />}
        title="Link your Telegram first"
        body="Your subscription lives on your Telegram account. Link it in Settings to unlock code generation."
        href="/dashboard/settings"
        cta="Link Telegram"
      />
    );
  }
  if (access.unavailable) {
    return (
      <Locked
        icon={<HugeiconsIcon icon={Alert02Icon} size={22} />}
        title="Couldn't check your subscription"
        body="The service may be waking up. Give it a minute, then refresh this page."
        href="/dashboard/generate"
        cta="Refresh"
      />
    );
  }
  if (!access.allowed) {
    return (
      <Locked
        icon={<HugeiconsIcon icon={Crown02Icon} size={22} />}
        title="A VIP subscription is required"
        body={`VIP is ${VIP_PRICE_SUMMARY}, paid by bank transfer. If you already subscribed in the Telegram bot, it unlocks here automatically.`}
        href="/dashboard/upgrade"
        cta="See pricing"
      />
    );
  }
  return <Generator initialService={isService(sport) ? sport : "football"} />;
}

export default async function GeneratePage({
  searchParams,
}: {
  searchParams: Promise<{ sport?: string }>;
}) {
  const user = await requireUser();
  const { sport } = await searchParams;

  return (
    <>
      <PageHead title="Generate" accent="codes">
        Pick a service and mint fresh SportyBet booking codes.
      </PageHead>
      <Suspense fallback={<Skeleton height={320} />}>
        <GenerateBody user={user} sport={sport} />
      </Suspense>
    </>
  );
}
