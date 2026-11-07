import "server-only";
import { connectDB } from "@/lib/db";
import { notifyPayment } from "@/lib/admin/notify";
import { Payment } from "@/lib/models/payment";

/**
 * Mark a website checkout as paid in our ledger. Only the call that actually changes it emails the
 * owners, so repeated checks never send a second alert. Never throws: the ledger is a record, not
 * the source of truth.
 */
export async function markPaid(reference: string): Promise<void> {
  try {
    await connectDB();
    const payment = await Payment.findOneAndUpdate(
      { reference, status: { $ne: "paid" } },
      { status: "paid", paidAt: new Date() },
    ).lean();
    if (payment) {
      await notifyPayment({
        userId: payment.userId,
        reference,
        amount: payment.quotedAmount ?? payment.expectedAmount,
      });
    }
  } catch (err) {
    console.error("[payment] couldn't mark paid", err);
  }
}
