import { NextResponse } from "next/server";
import { after } from "next/server";
import { getApiUserId } from "@/lib/api-user";
import { getCurrentUser } from "@/lib/auth/current-user";
import { connectDB } from "@/lib/db";
import { Payment } from "@/lib/models/payment";
import { VIP_PRICE_NGN } from "@/lib/plan";
import { initializePayment, SportyApiError } from "@/lib/sporty/client";

export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in first" }, { status: 401 });

  try {
    // Ids and email come from our records, never from the request body. Telegram is optional: it
    // is sent only when linked, so the bot can message the user and the plan is shared.
    const telegramId = user.telegram?.id;
    const checkout = await initializePayment({
      userId: getApiUserId(user),
      email: user.email,
      telegramId,
    });
    // Keep a local record for the admin area (support lookups, stuck payments, revenue).
    after(async () => {
      if (!checkout.reference) return;
      try {
        await connectDB();
        await Payment.updateOne(
          { reference: checkout.reference },
          {
            $setOnInsert: {
              reference: checkout.reference,
              userId: user.id,
              ...(telegramId ? { telegramId } : {}),
              expectedAmount: VIP_PRICE_NGN,
              quotedAmount: checkout.amount,
              status: "initiated",
              createdAt: new Date(),
            },
          },
          { upsert: true },
        );
      } catch (err) {
        console.error("[payment] couldn't record checkout", err);
      }
    });
    return NextResponse.json(checkout);
  } catch (err) {
    const message = err instanceof SportyApiError ? err.message : "Couldn't start the payment.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
