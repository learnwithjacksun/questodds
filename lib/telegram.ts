import "server-only";
import { createRemoteJWKSet, jwtVerify } from "jose";
import type { TelegramUser } from "@/lib/sporty/schemas";

/**
 * Telegram Login via the official OIDC JS library (telegram-login.js).
 * The browser popup returns an id_token. We verify it HERE against Telegram's published keys and
 * never trust the external API for identity: its `id_token` path accepts unsigned tokens, so a
 * forged token could otherwise sign in as any linked account.
 * No client secret is needed to verify an id_token.
 * @see https://core.telegram.org/bots/telegram-login
 */

const ISSUER = "https://oauth.telegram.org";
const JWKS = createRemoteJWKSet(new URL(`${ISSUER}/.well-known/jwks.json`));
/** Tokens are for an immediate sign-in, so old ones are refused (limits replay of a leaked token). */
const MAX_TOKEN_AGE = "10 minutes";

/** Bot Client ID from @BotFather → Login Widget (safe to expose to the browser). */
export function telegramClientId(): string | undefined {
  return process.env.TELEGRAM_CLIENT_ID?.trim() || undefined;
}

export type VerifyOutcome =
  | { ok: true; user: TelegramUser }
  | { ok: false; error: string; status: number };

const rejected = (error = "Telegram verification failed"): VerifyOutcome => ({
  ok: false,
  error,
  status: 401,
});

/** Verify a Telegram id_token (signature, issuer, audience, expiry, age) and read the user from it. */
export async function verifyIdToken(idToken: unknown): Promise<VerifyOutcome> {
  if (typeof idToken !== "string" || !idToken.trim()) {
    return { ok: false, error: "Invalid Telegram data", status: 400 };
  }
  const clientId = telegramClientId();
  if (!clientId) return { ok: false, error: "Telegram sign-in isn't configured yet.", status: 503 };

  let payload;
  try {
    ({ payload } = await jwtVerify(idToken.trim(), JWKS, {
      issuer: ISSUER,
      algorithms: ["RS256", "ES256", "EdDSA"],
      maxTokenAge: MAX_TOKEN_AGE,
      requiredClaims: ["exp", "iat", "aud"],
    }));
  } catch (err) {
    // JWKS fetch problems are ours/Telegram's to retry; anything else means a bad token.
    const code = (err as { code?: string }).code;
    if (code === "ERR_JWKS_TIMEOUT" || code === "ERR_JOSE_GENERIC" || !code) {
      console.error("[telegram] id_token verification error", err);
      return { ok: false, error: "Couldn't verify Telegram right now. Try again.", status: 502 };
    }
    return rejected();
  }

  // Telegram sends the bot's numeric ID as `aud` (possibly as a number), so compare as strings.
  const audiences = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
  if (!audiences.some((a) => String(a) === clientId)) return rejected();

  // `id` is the Telegram user ID; `sub` is a public (not per-bot) subject, so it is the same value.
  const rawId = payload.id ?? payload.sub;
  const id = typeof rawId === "number" ? String(rawId) : rawId;
  if (typeof id !== "string" || !/^\d{1,20}$/.test(id)) {
    console.error("[telegram] id_token has no usable user id; claims:", Object.keys(payload));
    return rejected("Telegram sent an unexpected response.");
  }

  const text = (v: unknown) => (typeof v === "string" && v ? v : null);
  return {
    ok: true,
    user: {
      id,
      firstName: text(payload.name),
      lastName: null,
      username: text(payload.preferred_username),
      photoUrl: text(payload.picture),
      phoneNumber: null,
      authDate: typeof payload.iat === "number" ? payload.iat : 0,
    },
  };
}
