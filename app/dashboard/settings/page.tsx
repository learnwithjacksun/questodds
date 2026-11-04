import type { Metadata } from "next";
import { TelegramCard } from "@/components/dashboard/telegram-card";
import { PageHead } from "@/components/dashboard/ui";
import { requireUser } from "@/lib/auth/current-user";
import { formatDay } from "@/lib/format";

export const metadata: Metadata = { title: "Settings – Quest Codes" };

export default async function SettingsPage() {
  const user = await requireUser();

  return (
    <>
      <PageHead title="Account" accent="settings">
        Your profile and connected accounts.
      </PageHead>

      <div className="qo-dash-grid qo-grid-2">
        <div className="qo-card">
          <h3>Profile</h3>
          <div className="qo-kv">
            <span>Username</span>
            <strong>{user.username}</strong>
          </div>
          <div className="qo-kv">
            <span>Email</span>
            <strong>{user.email}</strong>
          </div>
          <div className="qo-kv">
            <span>18+ confirmed</span>
            <strong>{formatDay(user.ageConfirmedAt)}</strong>
          </div>
        </div>

        <TelegramCard linked={user.telegram ? { username: user.telegram.username } : null} />
      </div>
    </>
  );
}
