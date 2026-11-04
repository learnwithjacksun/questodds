import "server-only";
import { SportyApiError, verifyTelegramLogin } from "@/lib/sporty/client";
import { telegramAuthPayloadSchema, type TelegramUser } from "@/lib/sporty/schemas";

/**
 * Classic Telegram Login Widget redirect flow (no Client Secret required).
 *   1. /api/auth/telegram/start redirects to oauth.telegram.org with bot_id + return_to.
 *   2. Telegram returns to /auth/telegram/return#tgAuthResult=… (hash is client-only).
 *   3. The return page rewrites the hash into query params and hits /api/auth/telegram/callback.
 *   4. We forward the widget payload to the external API, which checks the hash with the bot token.
 * Register the site domain under @BotFather → /setdomain (and Allowed URLs for the return path).
 */

export const TG_AUTHORIZE_URL = "https://oauth.telegram.org/auth";
export const TG_RETURN_PATH = "/auth/telegram/return";
export const TG_CALLBACK_PATH = "/api/auth/telegram/callback";
export const TG_STATE_COOKIE = "qo_tg_state";
export const TG_STATE_MAX_AGE = 10 * 60;

const MAX_AUTH_AGE_SECONDS = 24 * 60 * 60;

export type TelegramIntent = "login" | "link";

/** Public origin of this app (APP_URL in production; falls back to the request's origin). */
export function appOrigin(req: Request): string {
  const configured = process.env.APP_URL?.trim().replace(/\/$/, "");
  return configured || new URL(req.url).origin;
}

/** Bot id from BotFather (same value used as OIDC Client ID). */
export function telegramBotId(): string | undefined {
  return process.env.TELEGRAM_CLIENT_ID?.trim() || undefined;
}

export function parseTelegramIntent(raw: string | null | undefined): TelegramIntent | null {
  return raw === "login" || raw === "link" ? raw : null;
}

export type VerifyOutcome =
  | { ok: true; user: TelegramUser }
  | { ok: false; reason: "rejected" | "unavailable" | "expired" };

/**
 * Validates a Telegram Login Widget payload. The hash check is done by the external API; we add
 * a freshness check and only ever trust the identity it returns, never the ID the browser sent.
 */
export async function verifyWidgetPayload(body: unknown): Promise<VerifyOutcome> {
  const parsed = telegramAuthPayloadSchema.safeParse(body);
  if (!parsed.success) return { ok: false, reason: "rejected" };

  const ageSeconds = Math.floor(Date.now() / 1000) - parsed.data.auth_date;
  if (ageSeconds > MAX_AUTH_AGE_SECONDS || ageSeconds < -60) {
    return { ok: false, reason: "expired" };
  }

  try {
    // Forward the original keys: Telegram's hash covers every field it sent.
    const { user } = await verifyTelegramLogin(parsed.data);
    return { ok: true, user };
  } catch (err) {
    if (err instanceof SportyApiError) {
      const rejected = err.status === 400 || err.status === 401 || err.status === 403;
      if (!rejected) console.error("[telegram] widget verify failed", err.message);
      return { ok: false, reason: rejected ? "rejected" : "unavailable" };
    }
    throw err;
  }
}

/** Build a plain object from callback query params for schema parsing. */
export function widgetPayloadFromSearchParams(params: URLSearchParams): Record<string, unknown> {
  const payload: Record<string, unknown> = {};
  for (const [key, value] of params.entries()) {
    if (key === "tg" || key === "intent") continue;
    if (key === "id" || key === "auth_date") {
      const n = Number(value);
      payload[key] = Number.isFinite(n) ? n : value;
    } else {
      payload[key] = value;
    }
  }
  return payload;
}
