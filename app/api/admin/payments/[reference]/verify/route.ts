import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { audit } from "@/lib/admin/audit";
import { markPaid } from "@/lib/admin/payments";
import { actorOf, guardAdmin } from "@/lib/auth/require-admin";
import { Payment } from "@/lib/models/payment";
import { SportyApiError, verifyPayment } from "@/lib/sporty/client";

/**
 * Re-check one website payment with the payment service and fix our ledger if it was paid.
 * Safe to repeat: the service credits each reference exactly once.
 */
export async function POST(_req: Request, { params }: { params: Promise<{ reference: string }> }) {
  const guard = await guardAdmin();
  if (!guard.ok) return guard.response;

  const { reference } = await params;
  await connectDB();
  const payment = await Payment.findOne({ reference }).select("userId status").lean();
  if (!payment) return NextResponse.json({ error: "Unknown payment" }, { status: 404 });

  try {
    const result = await verifyPayment(reference);
    const paid = result.status === "paid";
    if (paid) await markPaid(reference);
    await audit({
      actor: actorOf(guard.staff),
      action: "payment.reverified",
      targetType: "payment",
      targetId: reference,
      meta: { userId: payment.userId, result: result.status ?? "unknown" },
    });
    return NextResponse.json({ status: paid ? "paid" : (result.status ?? "unpaid"), message: result.message });
  } catch (err) {
    const message = err instanceof SportyApiError ? err.message : "Couldn't check the payment.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
