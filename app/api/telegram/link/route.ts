import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/current-user";
import { User } from "@/lib/models/user";

/** Unlink Telegram from the signed-in account. (Linking happens in /api/auth/telegram/callback.) */
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
