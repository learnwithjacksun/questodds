import { Suspense } from "react";
import type { Metadata } from "next";
import { TelegramLogo } from "@/components/telegram/logo";
import { HistorySection } from "@/components/dashboard/stats";
import { Locked, PageHead, Skeleton } from "@/components/dashboard/ui";
import { requireUser } from "@/lib/auth/current-user";

export const metadata: Metadata = { title: "History – Quest Codes" };

export default async function HistoryPage() {
  const user = await requireUser();

  return (
    <>
      <PageHead title="Your" accent="history">
        Every slip generated for your account and how it turned out.
      </PageHead>

      {user.telegram ? (
        <Suspense fallback={<Skeleton height={320} />}>
          <HistorySection telegramId={user.telegram.id} />
        </Suspense>
      ) : (
        <Locked
          icon={<TelegramLogo size={24} />}
          title="Link Telegram to see your history"
          body="Slips are tracked against your Telegram account, so link it to see your stats here."
          href="/dashboard/settings"
          cta="Link Telegram"
        />
      )}
    </>
  );
}
