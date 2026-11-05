import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import {
  appOrigin,
  newFlowSecrets,
  telegramCredentials,
  TG_AUTHORIZE_URL,
  TG_CALLBACK_PATH,
  TG_FLOW_COOKIE,
  TG_FLOW_MAX_AGE,
  type TelegramIntent,
} from "@/lib/telegram";

/** Begin "Continue with Telegram": remember state + PKCE verifier, then send the user to Telegram. */
export async function GET(req: Request) {
  const origin = appOrigin(req);
  const intent: TelegramIntent =
    new URL(req.url).searchParams.get("intent") === "link" ? "link" : "login";
  const home = intent === "link" ? "/dashboard/settings" : "/login";
  const back = (code: string) => NextResponse.redirect(new URL(`${home}?tg=${code}`, origin));

  const creds = telegramCredentials();
  if (!creds) return back("unconfigured");

  // Linking attaches Telegram to an existing session, so require one up front.
  if (intent === "link" && !(await getCurrentUser())) {
    return NextResponse.redirect(new URL("/login?tg=signin", origin));
  }

  const { state, verifier, challenge } = newFlowSecrets();
  (await cookies()).set(TG_FLOW_COOKIE, [intent, state, verifier].join("."), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax", // Telegram returns via a top-level GET, which lax allows
    path: "/api/auth/telegram",
    maxAge: TG_FLOW_MAX_AGE,
  });

  const url = new URL(TG_AUTHORIZE_URL);
  url.searchParams.set("client_id", creds.clientId);
  url.searchParams.set("redirect_uri", `${origin}${TG_CALLBACK_PATH}`);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid profile telegram:bot_access");
  url.searchParams.set("state", state);
  url.searchParams.set("code_challenge", challenge);
  url.searchParams.set("code_challenge_method", "S256");
  return NextResponse.redirect(url);
}
