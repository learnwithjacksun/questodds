import { Suspense } from "react";
import { after } from "next/server";
import { DashNav, DashNavSkeleton } from "@/components/dashboard/nav";
import { PageLoader } from "@/components/page-loader";
import { requireUser } from "@/lib/auth/current-user";
import { wakeBackend } from "@/lib/sporty/client";

async function Header() {
  const user = await requireUser();
  // Start waking the external service now, so it is ready by the time a page needs it.
  after(wakeBackend);
  return <DashNav username={user.username} />;
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="qo-dash">
      <Suspense fallback={<DashNavSkeleton />}>
        <Header />
      </Suspense>

      <main className="qo-dash-main">
        <Suspense fallback={<PageLoader />}>{children}</Suspense>
      </main>

      <footer className="qo-dash-footer">
        <p>
          Quest Codes is an independent third-party platform and is not affiliated with, associated with,
          endorsed by, or officially connected to SportyBet or any of its subsidiaries or partners.
          SportyBet is a trademark of its respective owner.
        </p>
        <p>
          Quest Codes never places bets or handles your betting funds. Gambling involves risk. 18+ only.
          If gambling is a problem, seek help.
        </p>
      </footer>
    </div>
  );
}
