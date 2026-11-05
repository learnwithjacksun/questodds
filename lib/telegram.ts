import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { createRemoteJWKSet, jwtVerify } from "jose";
import type { TelegramUser } from "@/lib/sporty/schemas";

/**
 * Telegram Login, authorization-code flow with PKCE (https://core.telegram.org/bots/telegram-login).
 *   1. /api/auth/telegram/start sends the browser to Telegram with a fixed redirect_uri.
 *   2. Telegram returns to /api/auth/telegram/callback?code=…&state=…
 *   3. THIS server swaps the code for an id_token at Telegram's token endpoint (Client ID + Secret),
 *      then verifies the id_token against Telegram's published keys.
 * The external SportyBet API is never trusted for identity: its `id_token` path accepts unsigned
 * tokens. In BotFather → Login Widget, register exactly one Allowed URL: <APP_URL>/api/auth/telegram/callback
 */

const ISSUER = "https://oauth.telegram.org";
export const TG_AUTHORIZE_URL = `${ISSUER}/auth`;
const TG_TOKEN_URL = `${ISSUER}/token`;
const JWKS = createRemoteJWKSet(new URL(`${ISSUER}/.well-known/jwks.json`));

export const TG_CALLBACK_PATH = "/api/auth/telegram/callback";
export const TG_FLOW_COOKIE = "qo_tg_flow";
export const TG_FLOW_MAX_AGE = 10 * 60;
/** The id_token is used immediately, so anything older is refused (limits replay of a leaked token). */
const MAX_TOKEN_AGE = "10 minutes";

export type TelegramIntent = "login" | "link";

/** Public origin of this app (APP_URL in production; falls back to the request's origin). */
export function appOrigin(req: Request): string {
  const configured = process.env.APP_URL?.trim().replace(/\/$/, "");
  return configured || new URL(req.url).origin;
}

/** Client ID from @BotFather → Login Widget. The secret stays server-side. */
export function telegramCredentials(): { clientId: string; clientSecret: string } | null {
  const clientId = process.env.TELEGRAM_CLIENT_ID?.trim();
  const clientSecret = process.env.TELEGRAM_CLIENT_SECRET?.trim();
  return clientId && clientSecret ? { clientId, clientSecret } : null;
}

/** One-time CSRF `state` plus a PKCE verifier/challenge pair (S256). */
export function newFlowSecrets() {
  const verifier = randomBytes(32).toString("base64url"); // 43 chars, within PKCE's 43–128
  return {
    state: randomBytes(24).toString("base64url"),
    verifier,
    challenge: createHash("sha256").update(verifier).digest("base64url"),
  };
}

export type VerifyOutcome =
  | { ok: true; user: TelegramUser }
  | { ok: false; code: "invalid" | "unavailable" | "unconfigured" };

const invalid: VerifyOutcome = { ok: false, code: "invalid" };
const unavailable: VerifyOutcome = { ok: false, code: "unavailable" };

/** Exchange an authorization code for an id_token, then verify it. */
export async function exchangeTelegramCode(
  code: string,
  redirectUri: string,
  codeVerifier: string,
): Promise<VerifyOutcome> {
  const creds = telegramCredentials();
  if (!creds) return { ok: false, code: "unconfigured" };

  let res: Response;
  try {
    res = await fetch(TG_TOKEN_URL, {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        authorization: `Basic ${Buffer.from(`${creds.clientId}:${creds.clientSecret}`).toString("base64")}`,
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
        client_id: creds.clientId,
        code_verifier: codeVerifier,
      }),
      signal: AbortSignal.timeout(15_000),
    });
  } catch (err) {
    console.error("[telegram] token request failed", err);
    return unavailable;
  }
  if (res.status >= 500) return unavailable;

  // Telegram reports failures in the body (e.g. {"error":"invalid_grant"}), not always via status.
  const json: unknown = await res.json().catch(() => null);
  const body = json && typeof json === "object" ? (json as Record<string, unknown>) : {};
  if (typeof body.id_token !== "string") {
    console.error("[telegram] token exchange rejected:", body.error ?? res.status);
    return invalid;
  }
  return verifyIdToken(body.id_token, creds.clientId);
}

/** Verify signature, issuer, audience, expiry and age, then read the user from the token. */
async function verifyIdToken(idToken: string, clientId: string): Promise<VerifyOutcome> {
  let payload;
  try {
    ({ payload } = await jwtVerify(idToken, JWKS, {
      issuer: ISSUER,
      algorithms: ["RS256", "ES256", "EdDSA"],
      maxTokenAge: MAX_TOKEN_AGE,
      requiredClaims: ["exp", "iat", "aud"],
    }));
  } catch (err) {
    // Key-fetch problems are worth a retry; any other jose error means the token itself is bad.
    const code = (err as { code?: string }).code;
    if (!code || code === "ERR_JWKS_TIMEOUT" || code === "ERR_JOSE_GENERIC") {
      console.error("[telegram] id_token verification error", err);
      return unavailable;
    }
    return invalid;
  }

  // Telegram sends the bot's numeric ID as `aud` (possibly a number), so compare as strings.
  const audiences = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
  if (!audiences.some((a) => String(a) === clientId)) return invalid;

  // `id` is the Telegram user ID; `sub` is a public (not per-bot) subject, so it is the same value.
  const rawId = payload.id ?? payload.sub;
  const id = typeof rawId === "number" ? String(rawId) : rawId;
  if (typeof id !== "string" || !/^\d{1,20}$/.test(id)) {
    console.error("[telegram] id_token has no usable user id; claims:", Object.keys(payload));
    return invalid;
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
