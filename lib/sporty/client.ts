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
  telegramAuthResponseSchema,
  userStatsSchema,
  type Checkout,
  type GenerateResult,
  type GlobalStats,
  type LatestSlip,
  type PaymentStatus,
  type QuestSpecialStart,
  type QuestSpecialStatus,
  type Sport,
  type Subscription,
  type TelegramUser,
  type UserStats,
} from "@/lib/sporty/schemas";

const DEFAULT_BASE = "https://sportybetcodeautomation.onrender.com";

/** Render's free tier can take ~30–60s to wake, so reads get a generous timeout. */
const READ_TIMEOUT_MS = 45_000;
const GENERATE_TIMEOUT_MS = 5 * 60_000;

export class SportyApiError extends Error {
  constructor(
    message: string,
    readonly status?: number,
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
    throw new SportyApiError(message, res.status);
  }

  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    console.error("[sporty] unexpected response from", path, parsed.error.issues);
    throw new SportyApiError("The code service sent an unexpected response.", res.status);
  }
  return parsed.data;
}

/* ---------- Telegram & subscription ---------- */

/** Asks the external API to verify Telegram login (widget hash, id_token, or initData). */
export async function verifyTelegramLogin(
  payload: Record<string, unknown>,
): Promise<{ user: TelegramUser; subscription?: Subscription }> {
  const res = await request("/api/auth/telegram", telegramAuthResponseSchema, {
    method: "POST",
    body: payload,
  });
  if (!res.success || !res.user) {
    throw new SportyApiError(res.error ?? "Telegram verification failed.", 401);
  }
  return { user: res.user, subscription: res.subscription };
}

export async function getSubscription(telegramId: string): Promise<Subscription> {
  const res = await request(
    `/api/subscription/${encodeURIComponent(telegramId)}`,
    subscriptionResponseSchema,
  );
  return res.subscription;
}

/* ---------- Generation ---------- */

export function generateCodes(sport: Sport, userId: string, fresh = false): Promise<GenerateResult> {
  return request("/api/generate", generateResultSchema, {
    method: "POST",
    body: { sport, userId, fresh },
    timeoutMs: GENERATE_TIMEOUT_MS,
  });
}

/* ---------- Quest Special ---------- */

export async function startQuestSpecial(userId: string): Promise<QuestSpecialStart> {
  const res = await request("/api/quest-special/start", questSpecialStartSchema, {
    method: "POST",
    body: { userId },
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

export async function initializePayment(telegramId: string, email?: string): Promise<Checkout> {
  const res = await request("/api/payment/initialize", checkoutSchema, {
    method: "POST",
    body: { telegramId, email },
  });
  if (!res.success) throw new SportyApiError(res.error ?? "Couldn't start the payment.");
  return res;
}

export function verifyPayment(reference: string): Promise<PaymentStatus> {
  return request(`/api/payment/verify/${encodeURIComponent(reference)}`, paymentStatusSchema);
}
