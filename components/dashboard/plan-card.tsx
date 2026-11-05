import { HugeiconsIcon } from "@hugeicons/react";
import { Tick02Icon } from "@hugeicons/core-free-icons";
import { VIP_DAYS, VIP_FEATURES, VIP_PRICE_LABEL, VIP_PRICE_NGN, VIP_TERMS, formatNaira } from "@/lib/plan";

/** The plan and its price, shown before the user commits to anything. */
export function PlanCard({ children }: { children?: React.ReactNode }) {
  return (
    <section className="qo-card qo-plan" aria-label="VIP plan">
      <span className="qo-eyebrow">VIP plan</span>
      <p className="qo-plan-price">
        <strong>{VIP_PRICE_LABEL}</strong>
        <span>for {VIP_DAYS} days</span>
      </p>
      <p className="qo-plan-lead">{VIP_TERMS.oneTime}</p>

      <ul className="qo-plan-list">
        {VIP_FEATURES.map((f) => (
          <li key={f}>
            <HugeiconsIcon icon={Tick02Icon} size={18} aria-hidden="true" />
            {f}
          </li>
        ))}
      </ul>

      <p className="qo-fine">{VIP_TERMS.early}</p>
      {children}
    </section>
  );
}

/** What paying involves, so nobody is caught unprepared. */
export function HowPaying() {
  return (
    <section className="qo-card qo-how" aria-label="How paying works">
      <h3>How paying works</h3>
      <ol className="qo-steps">
        <li>
          <strong>Start the payment.</strong> We create a one-time bank account number for it. It
          expires, so have your bank app ready.
        </li>
        <li>
          <strong>Transfer exactly {formatNaira(VIP_PRICE_NGN)}.</strong> Use any Nigerian bank app. Don&apos;t
          round the amount up or down.
        </li>
        <li>
          <strong>Wait for confirmation.</strong> This page checks automatically. If nothing changes about 5
          seconds after you&apos;ve paid, tap <em>I&apos;ve paid</em>.
        </li>
      </ol>
      <p className="qo-fine">{VIP_TERMS.method}</p>
    </section>
  );
}
