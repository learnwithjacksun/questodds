import { after, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Payment } from "@/lib/models/payment";
import { guardApi, upstreamError } from "@/lib/api-guard";
import { getSubscription, verifyPayment } from "@/lib/sporty/client";
import type { PaymentCheck } from "@/lib/sporty/schemas";

/**
 * Check a payment. Returns the checkout status AND the live subscription: the external API only
 * remembers a checkout session for a while, but a transfer credited through its webhook always
 * shows up in the subscription, so the UI can rely on either.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ reference: string }> }) {
  const guard = await guardApi({ vip: false });
  if (!guard.ok) return guard.response;

  const { reference } = await params;
  // References look like VIP-<telegramId>-<timestamp>; only allow checking your own.
  if (!reference.startsWith(`VIP-${guard.telegramId}-`)) {
    return NextResponse.json({ error: "Unknown payment reference" }, { status: 404 });
  }

  const [payment, subscription] = await Promise.allSettled([
    verifyPayment(reference),
    getSubscription(guard.telegramId),
  ]);

  if (payment.status === "rejected" && subscription.status === "rejected") {
    return upstreamError(payment.reason, "Couldn't check the payment.");
  }

  const body: PaymentCheck = {
    status: payment.status === "fulfilled" ? (payment.value.status ?? "unpaid") : "unknown",
    message: payment.status === "fulfilled" ? payment.value.message : undefined,
    subscription: subscription.status === "fulfilled" ? subscription.value : null,
  };
  if (body.status === "paid") {
    after(async () => {
      try {
        await connectDB();
        await Payment.updateOne(
          { reference, status: { $ne: "paid" } },
          { status: "paid", paidAt: new Date() },
        );
      } catch (err) {
        console.error("[payment] couldn't mark paid", err);
      }
    });
  }
  return NextResponse.json(body);
}
