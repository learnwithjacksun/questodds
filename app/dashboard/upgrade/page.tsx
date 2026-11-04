import type { Metadata } from "next";
import { TelegramIcon } from "@hugeicons/core-free-icons";
import { AccessCard } from "@/components/dashboard/access-card";
import { Upgrade } from "@/components/dashboard/upgrade";
import { Locked, PageHead } from "@/components/dashboard/ui";
import { requireUser } from "@/lib/auth/current-user";
import { getAccess } from "@/lib/access";

export const metadata: Metadata = { title: "Upgrade – Quest Codes" };

export default async function UpgradePage() {
  const user = await requireUser();
  const access = await getAccess(user);

  return (
    <>
      <PageHead title="Upgrade to" accent="VIP">
        One subscription covers the website and the Telegram bot.
      </PageHead>

      {!access.linked ? (
        <Locked
          icon={TelegramIcon}
          title="Link your Telegram first"
          body="Payments are credited to your Telegram account so both platforms unlock together."
          href="/dashboard/settings"
          cta="Link Telegram"
        />
      ) : (
        <>
          <AccessCard access={access} />
          <section className="qo-dash-section">
            <Upgrade active={access.allowed} />
          </section>
        </>
      )}
    </>
  );
}
