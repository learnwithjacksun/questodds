import "server-only";
import { connectDB } from "@/lib/db";
import { notifyPayment } from "@/lib/admin/notify";
import { Payment } from "@/lib/models/payment";
import { VIP_DAYS } from "@/lib/plan";
import { getSubscription } from "@/lib/sporty/client";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * How many days the payment actually added, or null if we can't tell. A renewal adds to the time
 * left, so the baseline is whichever is later: now, or where the plan ended before paying.
 */
async function daysAdded(userId: string, expiryBefore: number | undefined): Promise<number | null> {
  if (expiryBefore === undefined) return null;
  try {
    const sub = await getSubscription(userId);
    if (!sub.expiresAt) return null;
    return (sub.expiresAt - Math.max(Date.now(), expiryBefore)) / DAY_MS;
  } catch {
    return null;
  }
}

/**
 * Mark a website checkout as paid in our ledger. Only the call that actually changes it emails the
 * owners, so repeated checks never send a second alert. The alert also flags a payment that added
 * more than one plan's worth of days. Never throws: the ledger is a record, not the source of truth.
 */
export async function markPaid(reference: string): Promise<void> {
  try {
    await connectDB();
    const payment = await Payment.findOneAndUpdate(
      { reference, status: { $ne: "paid" } },
      { status: "paid", paidAt: new Date() },
    ).lean();
    if (!payment) return;

    const added = await daysAdded(payment.userId, payment.expiryBefore ?? undefined);
    await notifyPayment({
      userId: payment.userId,
      reference,
      amount: payment.quotedAmount ?? payment.expectedAmount,
      // Half a day of slack for clock drift and the time between paying and this check.
      warning:
        added !== null && added > VIP_DAYS + 0.5
          ? `This payment added about ${added.toFixed(1)} days, not ${VIP_DAYS}. It may have been credited twice. Check the user's plan.`
          : undefined,
    });
  } catch (err) {
    console.error("[payment] couldn't mark paid", err);
  }
}
