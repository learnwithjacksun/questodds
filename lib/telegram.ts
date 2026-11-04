import "server-only";
import { SportyApiError, verifyTelegramLogin } from "@/lib/sporty/client";
import type { TelegramUser } from "@/lib/sporty/schemas";

/**
 * Telegram Login via the official OIDC JS library (telegram-login.js).
 * The browser popup returns an id_token; we forward { id_token } to the external API
 * (Sporty Option B), which verifies the JWT. No Client Secret is needed for this flow.
 * @see https://core.telegram.org/bots/telegram-login
 */

/** Bot Client ID from @BotFather → Login Widget (safe to expose to the browser). */
export function telegramClientId(): string | undefined {
  return process.env.TELEGRAM_CLIENT_ID?.trim() || undefined;
}

export type VerifyOutcome =
  | { ok: true; user: TelegramUser }
  | { ok: false; error: string; status: number };

/** Verify an OIDC id_token from Telegram.Login via the external API. */
export async function verifyIdToken(idToken: unknown): Promise<VerifyOutcome> {
  if (typeof idToken !== "string" || !idToken.trim()) {
    return { ok: false, error: "Invalid Telegram data", status: 400 };
  }

  try {
    const { user } = await verifyTelegramLogin({ id_token: idToken.trim() });
    return { ok: true, user };
  } catch (err) {
    if (err instanceof SportyApiError) {
      const rejected = err.status === 400 || err.status === 401 || err.status === 403;
      if (!rejected) console.error("[telegram] id_token verify failed", err.message);
      return {
        ok: false,
        error: rejected ? "Telegram verification failed" : err.message,
        status: rejected ? 401 : 502,
      };
    }
    throw err;
  }
}
