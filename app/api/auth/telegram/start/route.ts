import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import {
  appOrigin,
  createPkce,
  encodeTgAuthSession,
  telegramClientId,
  telegramClientSecret,
  TG_AUTHORIZE_URL,
  TG_CALLBACK_PATH,
  TG_STATE_COOKIE,
  TG_STATE_MAX_AGE,
  type TelegramIntent,
} from "@/lib/telegram";

/** Begin "Continue with Telegram": remember a one-time state + PKCE, then send the user to Telegram. */
export async function GET(req: Request) {
  const origin = appOrigin(req);
  const intent: TelegramIntent =
    new URL(req.url).searchParams.get("intent") === "link" ? "link" : "login";
  const home = intent === "link" ? "/dashboard/settings" : "/login";
  const back = (code: string) => NextResponse.redirect(new URL(`${home}?tg=${code}`, origin));

  const clientId = telegramClientId();
  if (!clientId || !telegramClientSecret()) return back("unconfigured");

  // Linking attaches Telegram to an existing session, so require one up front.
  if (intent === "link" && !(await getCurrentUser())) {
    return NextResponse.redirect(new URL("/login?tg=signin", origin));
  }

  const state = randomBytes(24).toString("base64url");
  const { verifier, challenge } = createPkce();
  (await cookies()).set(
    TG_STATE_COOKIE,
    encodeTgAuthSession({ intent, state, codeVerifier: verifier }),
    {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax", // Telegram returns via a top-level GET, which lax allows
      path: "/api/auth/telegram",
      maxAge: TG_STATE_MAX_AGE,
    },
  );

  const url = new URL(TG_AUTHORIZE_URL);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", `${origin}${TG_CALLBACK_PATH}`);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid profile");
  url.searchParams.set("state", state);
  url.searchParams.set("code_challenge", challenge);
  url.searchParams.set("code_challenge_method", "S256");
  return NextResponse.redirect(url);
}
