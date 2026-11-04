import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { SportyApiError, verifyPayment } from "@/lib/sporty/client";

export async function GET(_req: Request, { params }: { params: Promise<{ reference: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in first" }, { status: 401 });
  if (!user.telegram) {
    return NextResponse.json({ error: "Link your Telegram account first" }, { status: 403 });
  }

  const { reference } = await params;
  // References look like VIP-<telegramId>-<timestamp>; only allow checking your own.
  if (!reference.startsWith(`VIP-${user.telegram.id}-`)) {
    return NextResponse.json({ error: "Unknown payment reference" }, { status: 404 });
  }

  try {
    return NextResponse.json(await verifyPayment(reference));
  } catch (err) {
    const message = err instanceof SportyApiError ? err.message : "Couldn't check the payment.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
