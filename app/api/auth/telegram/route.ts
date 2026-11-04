import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { User } from "@/lib/models/user";
import { createSession } from "@/lib/auth/session";
import { verifyIdToken } from "@/lib/telegram";

/**
 * Sign in with Telegram (OIDC id_token from telegram-login.js).
 * Only works for accounts that already linked their Telegram: we never create accounts here,
 * because registration is where the 18+ confirmation happens.
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const outcome = await verifyIdToken(
    body && typeof body === "object" && "id_token" in body ? body.id_token : null,
  );
  if (!outcome.ok) return NextResponse.json({ error: outcome.error }, { status: outcome.status });

  try {
    await connectDB();
    const user = await User.findOne({ telegramId: outcome.user.id }).select("_id").lean();
    if (!user) {
      return NextResponse.json(
        {
          error:
            "No account is linked to this Telegram. Sign in with email, then link it in Settings.",
        },
        { status: 404 },
      );
    }
    await createSession(String(user._id));
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[auth] telegram login failed", err);
    return NextResponse.json({ error: "Something went wrong. Try again." }, { status: 500 });
  }
}
