import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { SportyApiError, verifyTelegramLogin } from "@/lib/sporty/client";
import type { TelegramUser } from "@/lib/sporty/schemas";

/**
 * Telegram OpenID Connect (authorization code + PKCE).
 *   1. /api/auth/telegram/start redirects the browser to Telegram with state + code_challenge.
 *   2. Telegram redirects back to /api/auth/telegram/callback?code=…&state=…
 *   3. We exchange the code at oauth.telegram.org/token (Client ID + Secret) for an id_token,
 *      then send { id_token } to the external API, which verifies it and returns the user.
 * Register the redirect URI under @BotFather → your bot → Login Widget → Allowed URLs.
 */

export const TG_AUTHORIZE_URL = "https://oauth.telegram.org/auth";
export const TG_TOKEN_URL = "https://oauth.telegram.org/token";
export const TG_CALLBACK_PATH = "/api/auth/telegram/callback";
export const TG_STATE_COOKIE = "qo_tg_state";
export const TG_STATE_MAX_AGE = 10 * 60;

export type TelegramIntent = "login" | "link";

/** Cookie value: "{intent}:{state}:{code_verifier}" */
export type TgAuthSession = {
  intent: TelegramIntent;
  state: string;
  codeVerifier: string;
};

/** Public origin of this app (APP_URL in production; falls back to the request's origin). */
export function appOrigin(req: Request): string {
  const configured = process.env.APP_URL?.trim().replace(/\/$/, "");
  return configured || new URL(req.url).origin;
}

export function telegramClientId(): string | undefined {
  return process.env.TELEGRAM_CLIENT_ID?.trim() || undefined;
}

export function telegramClientSecret(): string | undefined {
  return process.env.TELEGRAM_CLIENT_SECRET?.trim() || undefined;
}

/** PKCE S256 verifier + challenge for the authorize redirect. */
export function createPkce(): { verifier: string; challenge: string } {
  const verifier = randomBytes(32).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  return { verifier, challenge };
}

export function encodeTgAuthSession(session: TgAuthSession): string {
  return `${session.intent}:${session.state}:${session.codeVerifier}`;
}

export function decodeTgAuthSession(raw: string): TgAuthSession | null {
  const first = raw.indexOf(":");
  if (first <= 0) return null;
  const second = raw.indexOf(":", first + 1);
  if (second <= first + 1) return null;
  const intent = raw.slice(0, first) as TelegramIntent;
  if (intent !== "login" && intent !== "link") return null;
  const state = raw.slice(first + 1, second);
  const codeVerifier = raw.slice(second + 1);
  if (!state || !codeVerifier) return null;
  return { intent, state, codeVerifier };
}

export type VerifyOutcome =
  | { ok: true; user: TelegramUser }
  | { ok: false; reason: "rejected" | "unavailable" };

/**
 * Exchange an authorization code for an id_token at Telegram, then verify it via the external API.
 */
export async function exchangeTelegramCode(
  code: string,
  redirectUri: string,
  codeVerifier: string,
): Promise<VerifyOutcome> {
  const clientId = telegramClientId();
  const clientSecret = telegramClientSecret();
  if (!clientId || !clientSecret) {
    return { ok: false, reason: "unavailable" };
  }

  let idToken: string;
  try {
    idToken = await fetchTelegramIdToken({
      code,
      redirectUri,
      codeVerifier,
      clientId,
      clientSecret,
    });
  } catch (err) {
    console.error("[telegram] token exchange failed", err instanceof Error ? err.message : err);
    return { ok: false, reason: "rejected" };
  }

  try {
    const { user } = await verifyTelegramLogin({ id_token: idToken });
    return { ok: true, user };
  } catch (err) {
    if (err instanceof SportyApiError) {
      const rejected = err.status === 400 || err.status === 401 || err.status === 403;
      if (!rejected) console.error("[telegram] id_token verify failed", err.message);
      return { ok: false, reason: rejected ? "rejected" : "unavailable" };
    }
    throw err;
  }
}

async function fetchTelegramIdToken({
  code,
  redirectUri,
  codeVerifier,
  clientId,
  clientSecret,
}: {
  code: string;
  redirectUri: string;
  codeVerifier: string;
  clientId: string;
  clientSecret: string;
}): Promise<string> {
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const res = await fetch(TG_TOKEN_URL, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      authorization: `Basic ${credentials}`,
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      client_id: clientId,
      code_verifier: codeVerifier,
    }),
    signal: AbortSignal.timeout(15_000),
  });

  const json: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const detail =
      json && typeof json === "object" && "error" in json && typeof json.error === "string"
        ? json.error
        : `HTTP ${res.status}`;
    throw new Error(detail);
  }

  if (
    !json ||
    typeof json !== "object" ||
    !("id_token" in json) ||
    typeof json.id_token !== "string" ||
    !json.id_token
  ) {
    throw new Error("Token response missing id_token");
  }

  return json.id_token;
}
