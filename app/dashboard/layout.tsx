import { Suspense } from "react";
import { after } from "next/server";
import { DashNav, DashNavSkeleton } from "@/components/dashboard/nav";
import { SiteFooter } from "@/components/site-footer";
import { PageLoader } from "@/components/page-loader";
import { requireUser } from "@/lib/auth/current-user";
import { wakeBackend } from "@/lib/sporty/client";

async function Header() {
  const user = await requireUser();
  // Start waking the external service now, so it is ready by the time a page needs it.
  after(wakeBackend);
  return <DashNav username={user.username} isStaff={user.role !== "user"} />;
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

      <SiteFooter className="is-dash" />
    </div>
  );
}
