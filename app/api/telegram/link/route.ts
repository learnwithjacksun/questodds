import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/current-user";
import { User } from "@/lib/models/user";
import { verifyIdToken } from "@/lib/telegram";

/** Link the signed-in account to a verified Telegram identity (OIDC id_token). */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in first" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const outcome = await verifyIdToken(
    body && typeof body === "object" && "id_token" in body ? body.id_token : null,
  );
  if (!outcome.ok) return NextResponse.json({ error: outcome.error }, { status: outcome.status });
  const tg = outcome.user;

  try {
    await connectDB();
    if (await User.exists({ telegramId: tg.id, _id: { $ne: user.id } })) {
      return NextResponse.json(
        { error: "That Telegram account is already linked to another Quest Codes account" },
        { status: 409 },
      );
    }
    await User.updateOne(
      { _id: user.id },
      {
        telegramId: tg.id,
        telegramUsername: tg.username ?? undefined,
        telegramPhotoUrl: tg.photoUrl ?? undefined,
        telegramLinkedAt: new Date(),
      },
    );
    return NextResponse.json({ ok: true, username: tg.username ?? null });
  } catch (err) {
    if ((err as { code?: number }).code === 11000) {
      return NextResponse.json({ error: "That Telegram account is already linked" }, { status: 409 });
    }
    console.error("[telegram] link failed", err);
    return NextResponse.json({ error: "Something went wrong. Try again." }, { status: 500 });
  }
}

/** Unlink Telegram from the signed-in account. */
export async function DELETE() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in first" }, { status: 401 });

  await connectDB();
  await User.updateOne(
    { _id: user.id },
    { $unset: { telegramId: 1, telegramUsername: 1, telegramPhotoUrl: 1, telegramLinkedAt: 1 } },
  );
  return NextResponse.json({ ok: true });
}
