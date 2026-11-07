import "server-only";
import { cache } from "react";
import { after } from "next/server";
import { connectDB } from "@/lib/db";
import { User } from "@/lib/models/user";
import type { CurrentUser } from "@/lib/auth/current-user";
import { getSubscription } from "@/lib/sporty/client";

export type Access = {
  /** Telegram account linked to this user. */
  linked: boolean;
  /** Linked and allowed to generate codes (active VIP, or admin). */
  allowed: boolean;
  isAdmin: boolean;
  daysLeft: number | string;
  expDate: string | null;
  /** Epoch ms when the subscription ends (null if none). Used to detect a renewal landing. */
  expiresAt: number | null;
  /** The subscription service couldn't be reached, so status is unknown (not "expired"). */
  unavailable: boolean;
};

const NOT_LINKED: Access = {
  linked: false,
  allowed: false,
  isAdmin: false,
  daysLeft: 0,
  expDate: null,
  expiresAt: null,
  unavailable: false,
};

const lookup = cache(async (telegramId: string): Promise<Access> => {
  try {
    const sub = await getSubscription(telegramId);
    return {
      linked: true,
      allowed: sub.active || sub.isAdmin,
      isAdmin: sub.isAdmin,
      daysLeft: sub.daysLeft,
      expDate: sub.expDate,
      expiresAt: sub.expiresAt,
      unavailable: false,
    };
  } catch (err) {
    console.error("[access] subscription lookup failed", err);
    return { ...NOT_LINKED, linked: true, unavailable: true };
  }
});

/** The single seam deciding who may generate codes. */
export async function getAccess(user: Pick<CurrentUser, "id" | "telegram">): Promise<Access> {
  if (!user.telegram) return NOT_LINKED;
  const access = await lookup(user.telegram.id);
  if (!access.unavailable && access.expiresAt) snapshotVip(user.id, access.expiresAt);
  return access;
}

/**
 * Remember when VIP ends, so the admin area can list who is subscribed or expiring without calling
 * the external API once per user. Runs after the response and never affects it.
 */
function snapshotVip(userId: string, expiresAt: number) {
  try {
    after(async () => {
      try {
        await connectDB();
        const vipUntil = new Date(expiresAt);
        await User.updateOne({ _id: userId, vipUntil: { $ne: vipUntil } }, { vipUntil });
      } catch (err) {
        console.error("[access] couldn't save vipUntil", err);
      }
    });
  } catch {
    // Not inside a request scope (nothing to do).
  }
}
