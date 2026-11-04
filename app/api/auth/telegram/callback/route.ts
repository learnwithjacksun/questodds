import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/current-user";
import { createSession } from "@/lib/auth/session";
import { User } from "@/lib/models/user";
import {
  appOrigin,
  parseTelegramIntent,
  verifyWidgetPayload,
  widgetPayloadFromSearchParams,
  TG_STATE_COOKIE,
} from "@/lib/telegram";

/**
 * Completes Telegram login/link after the client return page turns #tgAuthResult into query params.
 * "login" signs in an account that already linked this Telegram; "link" attaches it to the
 * signed-in account. Accounts are never created from Telegram (18+ confirmation is on register).
 */
export async function GET(req: Request) {
  const origin = appOrigin(req);
  const params = new URL(req.url).searchParams;

  const jar = await cookies();
  const saved = jar.get(TG_STATE_COOKIE)?.value ?? "";
  jar.delete({ name: TG_STATE_COOKIE, path: "/api/auth/telegram" });

  const intent = parseTelegramIntent(saved);
  const home = intent === "link" ? "/dashboard/settings" : "/login";
  const go = (path: string, code: string) =>
    NextResponse.redirect(new URL(`${path}?tg=${code}`, origin));

  if (!intent) return go("/login", "expired");
  if (params.get("error")) return go(home, "denied");

  const outcome = await verifyWidgetPayload(widgetPayloadFromSearchParams(params));
  if (!outcome.ok) {
    if (outcome.reason === "expired") return go(home, "expired");
    return go(home, outcome.reason === "rejected" ? "failed" : "unavailable");
  }
  const tg = outcome.user;

  try {
    await connectDB();

    if (intent === "login") {
      const user = await User.findOne({ telegramId: tg.id }).select("_id").lean();
      if (!user) return go("/login", "not_linked");
      await createSession(String(user._id));
      return NextResponse.redirect(new URL("/dashboard", origin));
    }

    const current = await getCurrentUser();
    if (!current) return go("/login", "signin");
    if (await User.exists({ telegramId: tg.id, _id: { $ne: current.id } })) {
      return go(home, "taken");
    }
    await User.updateOne(
      { _id: current.id },
      {
        telegramId: tg.id,
        telegramUsername: tg.username ?? undefined,
        telegramPhotoUrl: tg.photoUrl ?? undefined,
        telegramLinkedAt: new Date(),
      },
    );
    return go(home, "linked");
  } catch (err) {
    if ((err as { code?: number }).code === 11000) return go(home, "taken");
    console.error("[telegram] callback failed", err);
    return go(home, "failed");
  }
}
