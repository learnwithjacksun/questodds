// TEMPORARY visual-QA page. Deleted before finishing; never ships.
"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { AccessCard } from "@/components/dashboard/access-card";
import { CheckoutPanel } from "@/components/dashboard/checkout-panel";
import { Generator } from "@/components/dashboard/generator";
import { HowPaying, PlanCard } from "@/components/dashboard/plan-card";
import { Locked, PageHead } from "@/components/dashboard/ui";
import { SupportWidget } from "@/components/support/support-widget";
import { Pricing } from "@/components/landing/pricing";
import { VIP_PRICE_LABEL } from "@/lib/plan";
import { HugeiconsIcon } from "@hugeicons/react";
import { Crown02Icon } from "@hugeicons/core-free-icons";

const account = {
  bankName: "Wema Bank / Xixapay",
  accountNumber: "9876543210",
  accountName: "SportyBet Codes VIP",
  expiresAt: "2026-11-05T18:30:00.000Z",
};
const noop = () => {};

function Inner() {
  const v = useSearchParams().get("v");
  return (
    <div className="qo-dash">
      <main className="qo-dash-main" style={{ paddingTop: 32 }}>
        {v === "pay" && (
          <>
            <PageHead title="Upgrade to" accent="VIP">
              One plan covers the website and the Telegram bot. Pay by bank transfer, no card needed.
            </PageHead>
            <AccessCard
              hideAction
              access={{ linked: true, allowed: false, isAdmin: false, daysLeft: 0, expDate: null, expiresAt: null, unavailable: false }}
            />
            <section className="qo-dash-section">
              <div className="qo-upgrade-grid">
                <PlanCard>
                  <button type="button" className="qo-btn-primary qo-plan-cta">
                    Pay {VIP_PRICE_LABEL} by bank transfer
                  </button>
                </PlanCard>
                <HowPaying />
              </div>
            </section>
            <section className="qo-dash-section">
              <div className="qo-upgrade-grid">
                <PlanCard>
                  <p className="qo-plan-note">Payment started. Follow the payment details.</p>
                </PlanCard>
                <CheckoutPanel
                  amount={1000}
                  expectedAmount={1000}
                  account={account}
                  reference="VIP-6916043986-1741234567890"
                  lapsed={false}
                  checking={false}
                  status="Checking automatically every few seconds."
                  onPaid={noop}
                  onNewPayment={noop}
                  newPaymentPending={false}
                />
              </div>
            </section>
            <section className="qo-dash-section">
              <div className="qo-upgrade-grid">
                <div />
                <CheckoutPanel
                  amount={1200}
                  expectedAmount={1000}
                  account={account}
                  reference="VIP-6916043986-1741234567890"
                  lapsed
                  checking
                  status="Automatic checking has stopped for this account."
                  onPaid={noop}
                  onNewPayment={noop}
                  newPaymentPending={false}
                />
              </div>
            </section>
          </>
        )}
        {v === "gen" && (
          <>
            <PageHead title="Generate" accent="codes">
              Pick a service and mint fresh SportyBet booking codes.
            </PageHead>
            <Generator initialService="football" />
            <section className="qo-dash-section">
              <Locked
                icon={<HugeiconsIcon icon={Crown02Icon} size={22} />}
                title="A VIP subscription is required"
                body="VIP is ₦1,000 for 7 days, paid by bank transfer. If you already subscribed in the Telegram bot, it unlocks here automatically."
                href="/dashboard/upgrade"
                cta="See pricing"
              />
            </section>
          </>
        )}
        {v === "price" && <Pricing />}
      </main>
      {v === "open" && <SupportWidget defaultOpen />}
    </div>
  );
}

export default function Preview() {
  return (
    <Suspense fallback={null}>
      <Inner />
    </Suspense>
  );
}
