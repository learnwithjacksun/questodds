import Link from "next/link";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import {
  Alert02Icon,
  CheckmarkCircle02Icon,
  Crown02Icon,
  TelegramIcon,
} from "@hugeicons/core-free-icons";
import type { Access } from "@/lib/access";

type View = { icon: IconSvgElement; tone: "ok" | "warn" | "idle"; title: string; body: string; href?: string; cta?: string };

function describe(access: Access): View {
  if (!access.linked) {
    return {
      icon: TelegramIcon,
      tone: "idle",
      title: "Link Telegram to get started",
      body: "Your subscription is tied to your Telegram account. Link it once and you can generate codes here.",
      href: "/dashboard/settings",
      cta: "Link Telegram",
    };
  }
  if (access.unavailable) {
    return {
      icon: Alert02Icon,
      tone: "warn",
      title: "Couldn't check your subscription",
      body: "The service may be waking up. Refresh in a minute.",
    };
  }
  if (access.allowed) {
    return {
      icon: CheckmarkCircle02Icon,
      tone: "ok",
      title: access.isAdmin ? "Admin access" : "VIP active",
      body: access.isAdmin
        ? "You can generate codes without a subscription."
        : `${access.daysLeft} day${access.daysLeft === 1 ? "" : "s"} left${access.expDate ? ` · renews by ${access.expDate}` : ""}.`,
      href: access.isAdmin ? undefined : "/dashboard/upgrade",
      cta: access.isAdmin ? undefined : "Extend",
    };
  }
  return {
    icon: Crown02Icon,
    tone: "idle",
    title: "No active subscription",
    body: "Upgrade to generate Football, eFootball and vFootball codes. A subscription bought on Telegram works here too.",
    href: "/dashboard/upgrade",
    cta: "Upgrade",
  };
}

export function AccessCard({ access }: { access: Access }) {
  const v = describe(access);
  return (
    <div className={`qo-card qo-access is-${v.tone}`}>
      <span className="qo-icon-badge" aria-hidden="true">
        <HugeiconsIcon icon={v.icon} size={22} />
      </span>
      <div className="qo-access-text">
        <h3>{v.title}</h3>
        <p>{v.body}</p>
      </div>
      {v.href && v.cta && (
        <Link href={v.href} className="qo-btn-primary qo-btn-sm">
          {v.cta}
        </Link>
      )}
    </div>
  );
}
