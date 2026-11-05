import "server-only";
import { cache } from "react";
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
export function getAccess(user: Pick<CurrentUser, "telegram">): Promise<Access> {
  return user.telegram ? lookup(user.telegram.id) : Promise.resolve(NOT_LINKED);
}
