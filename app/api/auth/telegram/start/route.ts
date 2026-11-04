import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import {
  appOrigin,
  parseTelegramIntent,
  telegramBotId,
  TG_AUTHORIZE_URL,
  TG_RETURN_PATH,
  TG_STATE_COOKIE,
  TG_STATE_MAX_AGE,
  type TelegramIntent,
} from "@/lib/telegram";

/** Begin Telegram login/link: remember intent, then send the user to Telegram's login page. */
export async function GET(req: Request) {
  const origin = appOrigin(req);
  const intent: TelegramIntent =
    parseTelegramIntent(new URL(req.url).searchParams.get("intent")) ?? "login";
  const home = intent === "link" ? "/dashboard/settings" : "/login";
  const back = (code: string) => NextResponse.redirect(new URL(`${home}?tg=${code}`, origin));

  const botId = telegramBotId();
  if (!botId) return back("unconfigured");

  // Linking attaches Telegram to an existing session, so require one up front.
  if (intent === "link" && !(await getCurrentUser())) {
    return NextResponse.redirect(new URL("/login?tg=signin", origin));
  }

  (await cookies()).set(TG_STATE_COOKIE, intent, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax", // Telegram returns via a top-level navigation, which lax allows
    path: "/api/auth/telegram",
    maxAge: TG_STATE_MAX_AGE,
  });

  const returnTo = new URL(TG_RETURN_PATH, origin);
  returnTo.searchParams.set("intent", intent);

  const url = new URL(TG_AUTHORIZE_URL);
  url.searchParams.set("bot_id", botId);
  url.searchParams.set("origin", origin);
  url.searchParams.set("request_access", "write");
  url.searchParams.set("embed", "0");
  url.searchParams.set("return_to", returnTo.toString());
  return NextResponse.redirect(url);
}
