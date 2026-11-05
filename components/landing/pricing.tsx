import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { Tick02Icon } from "@hugeicons/core-free-icons";
import { VIP_DAYS, VIP_FEATURES, VIP_PRICE_LABEL, VIP_TERMS } from "@/lib/plan";

/** Plain pricing so nobody signs up without knowing codes need a paid plan. */
export function Pricing() {
  return (
    <section id="pricing" className="qo-section">
      <h2 className="qo-h2">Pricing</h2>
      <div className="qo-card qo-pricing">
        <div className="qo-pricing-main">
          <span className="qo-eyebrow">VIP plan</span>
          <p className="qo-plan-price">
            <strong>{VIP_PRICE_LABEL}</strong>
            <span>for {VIP_DAYS} days</span>
          </p>
          <p className="qo-plan-lead">{VIP_TERMS.free}</p>
        </div>

        <div className="qo-pricing-side">
          <ul className="qo-plan-list">
            {VIP_FEATURES.map((f) => (
              <li key={f}>
                <HugeiconsIcon icon={Tick02Icon} size={18} aria-hidden="true" />
                {f}
              </li>
            ))}
          </ul>
          <p className="qo-fine">
            {VIP_TERMS.method} {VIP_TERMS.oneTime} {VIP_TERMS.early}
          </p>
          <Link href="/register" className="qo-btn-primary qo-pricing-cta">
            Create a free account
          </Link>
        </div>
      </div>
    </section>
  );
}
