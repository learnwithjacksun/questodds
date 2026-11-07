import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { audit } from "@/lib/admin/audit";
import { sendReceipt } from "@/lib/admin/notify";
import { actorOf, guardAdmin } from "@/lib/auth/require-admin";
import { Payment } from "@/lib/models/payment";

/** Email the payer their receipt again (or for the first time, if it never went out). Paid payments only. */
export async function POST(_req: Request, { params }: { params: Promise<{ reference: string }> }) {
  const guard = await guardAdmin();
  if (!guard.ok) return guard.response;

  const { reference } = await params;
  await connectDB();
  const payment = await Payment.findOne({ reference }).lean();
  if (!payment) return NextResponse.json({ error: "Unknown payment" }, { status: 404 });
  if (payment.status !== "paid") {
    return NextResponse.json({ error: "Only paid payments get a receipt. Re-verify it first." }, { status: 409 });
  }

  const sent = await sendReceipt({
    userId: payment.userId,
    reference,
    amount: payment.quotedAmount ?? payment.expectedAmount,
  });
  await audit({
    actor: actorOf(guard.staff),
    action: "payment.receipt_sent",
    targetType: "payment",
    targetId: reference,
    meta: { userId: payment.userId, sent },
  });
  if (!sent) return NextResponse.json({ error: "Couldn't send the email. Try again." }, { status: 502 });
  return NextResponse.json({ ok: true });
}
