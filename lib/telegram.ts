import "server-only";
import { SportyApiError, verifyTelegramLogin } from "@/lib/sporty/client";
import { telegramAuthPayloadSchema, type TelegramUser } from "@/lib/sporty/schemas";

const MAX_AUTH_AGE_SECONDS = 24 * 60 * 60;

export type VerifyOutcome =
  | { ok: true; user: TelegramUser }
  | { ok: false; error: string; status: number };

/**
 * Validates a Telegram Login Widget payload. The hash check is done by the external API; we add
 * a freshness check and only ever trust the identity it returns, never the ID the browser sent.
 */
export async function verifyWidgetPayload(body: unknown): Promise<VerifyOutcome> {
  const parsed = telegramAuthPayloadSchema.safeParse(body);
  if (!parsed.success) return { ok: false, error: "Invalid Telegram data", status: 400 };

  const ageSeconds = Math.floor(Date.now() / 1000) - parsed.data.auth_date;
  if (ageSeconds > MAX_AUTH_AGE_SECONDS) {
    return { ok: false, error: "Telegram login expired. Try again.", status: 400 };
  }

  try {
    // Forward the original keys: Telegram's hash covers every field it sent.
    const { user } = await verifyTelegramLogin(parsed.data);
    return { ok: true, user };
  } catch (err) {
    if (err instanceof SportyApiError) {
      const rejected = err.status === 401 || err.status === 403 || err.status === 400;
      return {
        ok: false,
        error: rejected ? "Telegram verification failed" : err.message,
        status: rejected ? 401 : 502,
      };
    }
    throw err;
  }
}
