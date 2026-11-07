import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { LogoMark } from "@/components/brand/logo-mark";
import { AdminNav } from "@/components/admin/nav";
import { GateCode, GateNeedsTelegram } from "@/components/admin/gate";
import { PageLoader } from "@/components/page-loader";
import { resolveGate } from "@/lib/auth/require-admin";

export const metadata: Metadata = {
  title: "Admin – Quest Codes",
  robots: { index: false, follow: false, nocache: true },
};

/** Decides what the visitor sees: nothing (404), the sign-in steps, or the admin area itself. */
async function Gate({ children }: { children: React.ReactNode }) {
  const gate = await resolveGate();

  if (gate.state === "signed_out") redirect("/login");
  if (gate.state === "forbidden") notFound(); // don't reveal that an admin area exists

  if (gate.state === "needs_telegram" || gate.state === "needs_code") {
    return (
      <div className="qo-auth">
        <Link href="/dashboard" className="qo-logo qo-auth-logo" aria-label="Back to the dashboard">
          <LogoMark />
          Quest Codes
        </Link>
        <main className="qo-auth-card">
          {gate.state === "needs_telegram" ? (
            <GateNeedsTelegram />
          ) : (
            <GateCode email={gate.staff.email} username={gate.staff.username} />
          )}
        </main>
      </div>
    );
  }

  return (
    <div className="qo-dash qo-admin">
      <AdminNav username={gate.staff.username} role={gate.staff.role} />
      <main className="qo-dash-main">
        <Suspense fallback={<PageLoader />}>{children}</Suspense>
      </main>
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<PageLoader />}>
      <Gate>{children}</Gate>
    </Suspense>
  );
}
