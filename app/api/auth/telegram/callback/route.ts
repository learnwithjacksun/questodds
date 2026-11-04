import { timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/current-user";
import { createSession } from "@/lib/auth/session";
import { User } from "@/lib/models/user";
import {
  appOrigin,
  exchangeTelegramCode,
  TG_CALLBACK_PATH,
  TG_STATE_COOKIE,
  type TelegramIntent,
} from "@/lib/telegram";

function sameState(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/**
 * Telegram redirects here. "login" signs in an account that already linked this Telegram;
 * "link" attaches it to the signed-in account. Accounts are never created from Telegram, because
 * registration is where the 18+ confirmation happens.
 */
export async function GET(req: Request) {
  const origin = appOrigin(req);
  const params = new URL(req.url).searchParams;

  const jar = await cookies();
  const saved = jar.get(TG_STATE_COOKIE)?.value ?? "";
  jar.delete({ name: TG_STATE_COOKIE, path: "/api/auth/telegram" });

  const sep = saved.indexOf(":");
  const intent = (sep > 0 ? saved.slice(0, sep) : "") as TelegramIntent;
  const state = sep > 0 ? saved.slice(sep + 1) : "";

  const home = intent === "link" ? "/dashboard/settings" : "/login";
  const go = (path: string, code: string) =>
    NextResponse.redirect(new URL(`${path}?tg=${code}`, origin));

  if ((intent !== "login" && intent !== "link") || !state || !sameState(state, params.get("state") ?? "")) {
    return go("/login", "expired");
  }
  if (params.get("error")) return go(home, "denied");

  const code = params.get("code");
  if (!code) return go(home, "failed");

  const outcome = await exchangeTelegramCode(code, `${origin}${TG_CALLBACK_PATH}`);
  if (!outcome.ok) return go(home, outcome.reason === "rejected" ? "failed" : "unavailable");
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
