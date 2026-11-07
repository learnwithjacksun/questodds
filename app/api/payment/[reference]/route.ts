import { after, NextResponse } from "next/server";
import { markPaid } from "@/lib/admin/payments";
import { guardApi, upstreamError } from "@/lib/api-guard";
import { getSubscription, verifyPayment } from "@/lib/sporty/client";
import type { PaymentCheck } from "@/lib/sporty/schemas";

/**
 * "I've paid": checks one payment once and returns the live subscription with it. The page polls
 * /api/subscription instead, so this is only called when the user taps the button. The service
 * credits each reference exactly once, so repeated taps never extend the plan twice.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ reference: string }> }) {
  const guard = await guardApi({ vip: false });
  if (!guard.ok) return guard.response;

  const { reference } = await params;
  // References look like VIP-<id>-<timestamp>, where <id> is the account _id or its linked Telegram ID.
  // Only allow checking your own.
  const owned = [guard.apiUserId, guard.telegramId]
    .filter((id): id is string => !!id)
    .some((id) => reference.startsWith(`VIP-${id}-`));
  if (!owned) {
    return NextResponse.json({ error: "Unknown payment reference" }, { status: 404 });
  }

  const [payment, subscription] = await Promise.allSettled([
    verifyPayment(reference),
    getSubscription(guard.apiUserId),
  ]);

  if (payment.status === "rejected" && subscription.status === "rejected") {
    return upstreamError(payment.reason, "Couldn't check the payment.");
  }

  const body: PaymentCheck = {
    status: payment.status === "fulfilled" ? (payment.value.status ?? "unpaid") : "unknown",
    message: payment.status === "fulfilled" ? payment.value.message : undefined,
    subscription: subscription.status === "fulfilled" ? subscription.value : null,
  };
  if (body.status === "paid") after(() => markPaid(reference));
  return NextResponse.json(body);
}
