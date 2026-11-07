import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { Alert02Icon, CheckmarkCircle02Icon, Crown02Icon } from "@hugeicons/core-free-icons";
import type { Access } from "@/lib/access";
import { VIP_PRICE_SUMMARY } from "@/lib/plan";

type View = { icon: React.ReactNode; tone: "ok" | "warn" | "idle"; title: string; body: string; href?: string; cta?: string };

function describe(access: Access): View {
  if (access.unavailable) {
    return {
      icon: <HugeiconsIcon icon={Alert02Icon} size={22} />,
      tone: "warn",
      title: "Couldn't check your subscription",
      body: "The service may be waking up. Refresh in a minute.",
    };
  }
  if (access.allowed) {
    return {
      icon: <HugeiconsIcon icon={CheckmarkCircle02Icon} size={22} />,
      tone: "ok",
      title: access.isAdmin ? "Admin access" : "VIP active",
      body: access.isAdmin
        ? "You can generate codes without a subscription."
        : `${access.daysLeft} day${access.daysLeft === 1 ? "" : "s"} left${access.expDate ? ` · ends ${access.expDate}` : ""}.`,
      href: access.isAdmin ? undefined : "/dashboard/upgrade",
      cta: access.isAdmin ? undefined : "Extend",
    };
  }
  return {
    icon: <HugeiconsIcon icon={Crown02Icon} size={22} />,
    tone: "idle",
    title: "No active subscription",
    body: `VIP is ${VIP_PRICE_SUMMARY}. It unlocks code generation here and in the Telegram bot. No Telegram needed to subscribe.`,
    href: "/dashboard/upgrade",
    cta: "Upgrade",
  };
}

export function AccessCard({ access, hideAction = false }: { access: Access; hideAction?: boolean }) {
  const v = describe(access);
  return (
    <div className={`qo-card qo-access is-${v.tone}`}>
      <span className="qo-icon-badge" aria-hidden="true">
        {v.icon}
      </span>
      <div className="qo-access-text">
        <h3>{v.title}</h3>
        <p>{v.body}</p>
      </div>
      {!hideAction && v.href && v.cta && (
        <Link href={v.href} className="qo-btn-primary qo-btn-sm">
          {v.cta}
        </Link>
      )}
    </div>
  );
}
