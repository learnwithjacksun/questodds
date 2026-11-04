import "server-only";
import { SportyApiError, verifyTelegramLogin } from "@/lib/sporty/client";
import type { TelegramUser } from "@/lib/sporty/schemas";

/**
 * Telegram OpenID Connect (authorization code flow).
 *   1. /api/auth/telegram/start redirects the browser to Telegram with a one-time `state`.
 *   2. Telegram redirects back to /api/auth/telegram/callback?code=…&state=…
 *   3. We send { code, redirect_uri } to the external API, which exchanges it using the bot's
 *      Client ID + Secret and returns the verified Telegram user. The secret never lives here.
 * Register the redirect URI under @BotFather → your bot → Login Widget → Allowed URLs.
 */

export const TG_AUTHORIZE_URL = "https://oauth.telegram.org/auth";
export const TG_CALLBACK_PATH = "/api/auth/telegram/callback";
export const TG_STATE_COOKIE = "qo_tg_state";
export const TG_STATE_MAX_AGE = 10 * 60;

export type TelegramIntent = "login" | "link";

/** Public origin of this app (APP_URL in production; falls back to the request's origin). */
export function appOrigin(req: Request): string {
  const configured = process.env.APP_URL?.trim().replace(/\/$/, "");
  return configured || new URL(req.url).origin;
}

export type VerifyOutcome =
  | { ok: true; user: TelegramUser }
  | { ok: false; reason: "rejected" | "unavailable" };

/** Exchange an authorization code (via the external API) for the verified Telegram identity. */
export async function exchangeTelegramCode(code: string, redirectUri: string): Promise<VerifyOutcome> {
  try {
    const { user } = await verifyTelegramLogin({ code, redirect_uri: redirectUri });
    return { ok: true, user };
  } catch (err) {
    if (err instanceof SportyApiError) {
      const rejected = err.status === 400 || err.status === 401 || err.status === 403;
      if (!rejected) console.error("[telegram] code exchange failed", err.message);
      return { ok: false, reason: rejected ? "rejected" : "unavailable" };
    }
    throw err;
  }
}
