import "server-only";
import { connectDB } from "@/lib/db";
import { Payment } from "@/lib/models/payment";

/** Mark a website checkout as paid in our ledger (once). Never throws: the ledger is a record, not the source of truth. */
export async function markPaid(reference: string): Promise<void> {
  try {
    await connectDB();
    await Payment.updateOne({ reference, status: { $ne: "paid" } }, { status: "paid", paidAt: new Date() });
  } catch (err) {
    console.error("[payment] couldn't mark paid", err);
  }
}
