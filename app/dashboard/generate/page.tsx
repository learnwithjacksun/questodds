import type { Metadata } from "next";
import { Alert02Icon, Crown02Icon, TelegramIcon } from "@hugeicons/core-free-icons";
import { Generator } from "@/components/dashboard/generator";
import { Locked, PageHead } from "@/components/dashboard/ui";
import { requireUser } from "@/lib/auth/current-user";
import { getAccess } from "@/lib/access";
import { isService } from "@/lib/sporty/sports";

export const metadata: Metadata = { title: "Generate – Quest Codes" };

export default async function GeneratePage({
  searchParams,
}: {
  searchParams: Promise<{ sport?: string }>;
}) {
  const user = await requireUser();
  const access = await getAccess(user);
  const { sport } = await searchParams;

  return (
    <>
      <PageHead title="Generate" accent="codes">
        Pick a service and mint fresh SportyBet booking codes.
      </PageHead>

      {!access.linked ? (
        <Locked
          icon={TelegramIcon}
          title="Link your Telegram first"
          body="Your subscription lives on your Telegram account. Link it in Settings to unlock code generation."
          href="/dashboard/settings"
          cta="Link Telegram"
        />
      ) : access.unavailable ? (
        <Locked
          icon={Alert02Icon}
          title="Couldn't check your subscription"
          body="The service may be waking up. Give it a minute, then refresh this page."
          href="/dashboard/generate"
          cta="Refresh"
        />
      ) : !access.allowed ? (
        <Locked
          icon={Crown02Icon}
          title="A VIP subscription is required"
          body="Upgrade to generate codes. If you already subscribed in the Telegram bot, it unlocks here automatically."
          href="/dashboard/upgrade"
          cta="See upgrade options"
        />
      ) : (
        <Generator initialService={isService(sport) ? sport : "football"} />
      )}
    </>
  );
}
