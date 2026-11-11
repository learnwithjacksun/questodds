import "server-only";
import type { z } from "zod";
import {
  checkoutSchema,
  generateResultSchema,
  globalStatsSchema,
  latestSlipsSchema,
  paymentStatusSchema,
  questSpecialStartSchema,
  questSpecialStatusSchema,
  questSpecialStopSchema,
  subscriptionResponseSchema,
  userStatsSchema,
  type Checkout,
  type GenerateResult,
  type GlobalStats,
  type LatestSlip,
  type PaymentStatus,
  type QuestSpecialStart,
  type QuestStartRequest,
  type QuestSpecialStatus,
  type Sport,
  type Subscription,
  type Tier,
  type UserStats,
} from "@/lib/sporty/schemas";

const DEFAULT_BASE = "https://sportybetcodeautomation.onrender.com";

/**
 * Reads fail fast: a page must not hang for a minute on a sleeping backend (Render's free tier needs
 * ~30–60s to wake). Callers show an "unavailable, try again" state instead, and wakeBackend()
 * starts the wake-up in the background. Long jobs opt in to longer timeouts explicitly.
 */
const READ_TIMEOUT_MS = 10_000;
const WRITE_TIMEOUT_MS = 25_000;
const GENERATE_TIMEOUT_MS = 5 * 60_000;

export class SportyApiError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    /** Machine-readable reason from the service, e.g. "subscription_required". */
    readonly code?: string,
    /** Sent with an "invalid_tier" 400. For development logging only. */
    readonly validTiers?: string[],
  ) {
    super(message);
    this.name = "SportyApiError";
  }
}

type RequestOptions = { method?: "GET" | "POST"; body?: unknown; timeoutMs?: number };

async function request<S extends z.ZodType>(
  path: string,
  schema: S,
  { method = "GET", body, timeoutMs = READ_TIMEOUT_MS }: RequestOptions = {},
): Promise<z.infer<S>> {
  const base = (process.env.SPORTY_API_BASE || DEFAULT_BASE).replace(/\/$/, "");

  let res: Response;
  try {
    res = await fetch(`${base}${path}`, {
      method,
      headers: body ? { "content-type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (err) {
    const timedOut = err instanceof DOMException && err.name === "TimeoutError";
    throw new SportyApiError(
      timedOut ? "The code service took too long to respond." : "Couldn't reach the code service.",
    );
  }

  const json: unknown = await res.json().catch(() => null);

  if (!res.ok) {
    const message =
      json && typeof json === "object" && "error" in json && typeof json.error === "string"
        ? json.error
        : "The code service returned an error.";
    const code =
      json && typeof json === "object" && "code" in json && typeof json.code === "string"
        ? json.code
        : undefined;
    const validTiers =
      json && typeof json === "object" && "validTiers" in json && Array.isArray(json.validTiers)
        ? json.validTiers.filter((t): t is string => typeof t === "string")
        : undefined;
    throw new SportyApiError(message, res.status, code, validTiers);
  }

  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    console.error("[sporty] unexpected response from", path, parsed.error.issues);
    throw new SportyApiError("The code service sent an unexpected response.", res.status);
  }
  return parsed.data;
}

/* ---------- Subscription ---------- */
// Telegram identity is verified locally in lib/telegram.ts, never through this API.

/** Read-only and safe to poll. Accepts any id linked to the account (see lib/api-user.ts). */
export async function getSubscription(id: string): Promise<Subscription> {
  const res = await request(
    `/api/subscription/${encodeURIComponent(id)}`,
    subscriptionResponseSchema,
    { timeoutMs: 8_000 },
  );
  return res.subscription;
}

/* ---------- Generation ---------- */

export function generateCodes(
  sport: Sport,
  userId: string,
  fresh = false,
  pick: { tier?: Tier; tiers?: Tier[] } = {},
): Promise<GenerateResult> {
  return request("/api/generate", generateResultSchema, {
    method: "POST",
    // Tier choices apply to football only; the service ignores them for the other sports.
    body: {
      sport,
      userId,
      fresh,
      ...(sport === "football" && pick.tiers?.length ? { tiers: pick.tiers } : {}),
      ...(sport === "football" && !pick.tiers?.length && pick.tier ? { tier: pick.tier } : {}),
    },
    timeoutMs: GENERATE_TIMEOUT_MS,
  });
}

/* ---------- Quest Special ---------- */

export async function startQuestSpecial(
  userId: string,
  options: QuestStartRequest = { mode: "any", legs: 1 },
): Promise<QuestSpecialStart> {
  const res = await request("/api/quest-special/start", questSpecialStartSchema, {
    method: "POST",
    body: { userId, mode: options.mode, legs: options.legs },
    timeoutMs: WRITE_TIMEOUT_MS,
  });
  if (!res.success) throw new SportyApiError(res.error ?? "Couldn't start Quest Special.", 403);
  return res;
}

export function getQuestSpecialStatus(userId: string): Promise<QuestSpecialStatus> {
  return request(`/api/quest-special/status/${encodeURIComponent(userId)}`, questSpecialStatusSchema);
}

export function stopQuestSpecial(userId: string) {
  return request("/api/quest-special/stop", questSpecialStopSchema, {
    method: "POST",
    body: { userId },
  });
}

/* ---------- Analytics ---------- */

export async function getGlobalStats(): Promise<GlobalStats> {
  return (await request("/api/analytics/global", globalStatsSchema)).data;
}

export async function getUserStats(userId: string): Promise<UserStats> {
  return (await request(`/api/analytics/user/${encodeURIComponent(userId)}`, userStatsSchema)).data;
}

export async function getLatestSlips(): Promise<LatestSlip[]> {
  return (await request("/api/slips/latest", latestSlipsSchema)).data;
}

/* ---------- Payments ---------- */

/**
 * `userId` is the account's _id and `email` its real lowercase email. `telegramId` is sent only
 * when Telegram is linked (that user then also gets the bot's "Payment confirmed" message).
 */
export async function initializePayment(input: {
  userId: string;
  email: string;
  telegramId?: string;
}): Promise<Checkout> {
  const body: Record<string, string> = { userId: input.userId, email: input.email.toLowerCase() };
  if (input.telegramId) body.telegramId = input.telegramId;
  const res = await request("/api/payment/initialize", checkoutSchema, {
    method: "POST",
    body,
    timeoutMs: WRITE_TIMEOUT_MS,
  });
  if (!res.success) throw new SportyApiError(res.error ?? "Couldn't start the payment.");
  return res;
}

export function verifyPayment(reference: string): Promise<PaymentStatus> {
  return request(`/api/payment/verify/${encodeURIComponent(reference)}`, paymentStatusSchema, {
    timeoutMs: 15_000,
  });
}

/**
 * Fire-and-forget ping so a sleeping backend starts waking while the user is still reading the
 * page. Never throws and never blocks rendering.
 */
export function wakeBackend(): void {
  const base = (process.env.SPORTY_API_BASE || DEFAULT_BASE).replace(/\/$/, "");
  fetch(`${base}/ping`, { signal: AbortSignal.timeout(60_000), cache: "no-store" }).catch(() => {});
}
