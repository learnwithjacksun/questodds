import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { initializePayment, SportyApiError } from "@/lib/sporty/client";

export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in first" }, { status: 401 });
  if (!user.telegram) {
    return NextResponse.json({ error: "Link your Telegram account first" }, { status: 403 });
  }

  try {
    // Telegram ID and email come from our records, never from the request body.
    return NextResponse.json(await initializePayment(user.telegram.id, user.email));
  } catch (err) {
    const message = err instanceof SportyApiError ? err.message : "Couldn't start the payment.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
