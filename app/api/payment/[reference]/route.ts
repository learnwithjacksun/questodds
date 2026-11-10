import { after, NextResponse } from "next/server";
import { markPaid } from "@/lib/admin/payments";
import { connectDB } from "@/lib/db";
import { Payment } from "@/lib/models/payment";
import { guardApi, upstreamError } from "@/lib/api-guard";
import { getSubscription, verifyPayment } from "@/lib/sporty/client";
import type { PaymentCheck, PaymentStatus } from "@/lib/sporty/schemas";

/** References being checked right now on this instance. */
const checking = new Set<string>();

async function isRecordedPaid(reference: string): Promise<boolean> {
  try {
    await connectDB();
    return !!(await Payment.exists({ reference, status: "paid" }));
  } catch {
    return false;
  }
}

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

  // Ask the payment service as rarely as possible: once we've recorded a payment as paid it is never
  // checked again, and two checks for one reference never run at the same time.
  const alreadyPaid = await isRecordedPaid(reference);
  const concurrent = checking.has(reference);
  if (!alreadyPaid && !concurrent) checking.add(reference);

  const [payment, subscription] = await Promise.allSettled([
    alreadyPaid
      ? Promise.resolve<PaymentStatus>({ success: true, status: "paid", alreadyCredited: true })
      : concurrent
        ? Promise.resolve<PaymentStatus>({ success: false, status: "unknown" })
        : verifyPayment(reference).finally(() => checking.delete(reference)),
    getSubscription(guard.apiUserId),
  ]);

  if (payment.status === "rejected" && subscription.status === "rejected") {
    return upstreamError(payment.reason, "Couldn't check the payment.");
  }

  const body: PaymentCheck = {
    status: payment.status === "fulfilled" ? (payment.value.status ?? "unpaid") : "unknown",
    message: payment.status === "fulfilled" ? payment.value.message : undefined,
    alreadyCredited: payment.status === "fulfilled" ? payment.value.alreadyCredited : undefined,
    subscription: subscription.status === "fulfilled" ? subscription.value : null,
  };
  if (body.status === "paid") after(() => markPaid(reference));
  return NextResponse.json(body);
}
