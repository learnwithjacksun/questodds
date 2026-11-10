import { z } from "zod";

/**
 * Types for the external SportyBet automation API (see public/API_DOCUMENTATION.md).
 * Schemas are the source of truth; every type below is inferred from them so responses are
 * validated at runtime instead of being trusted blindly.
 */

/* ---------- Shared ---------- */
/** Links from the API end up in `href`s, so only http(s) is accepted (no `javascript:` etc.). */
const httpUrl = z.url({ protocol: /^https?$/ });

export const SPORTS = ["football", "efootball", "vfootball"] as const;
export const sportSchema = z.enum(SPORTS);
export type Sport = z.infer<typeof sportSchema>;

export const slipStatusSchema = z.enum(["pending", "boomed", "lost"]);
export type SlipStatus = z.infer<typeof slipStatusSchema>;

const sportStatsSchema = z.object({
  total: z.number(),
  boomed: z.number(),
  lost: z.number(),
  pending: z.number(),
  boomRate: z.string(),
});
export type SportStats = z.infer<typeof sportStatsSchema>;

/* ---------- Subscription ---------- */
export const subscriptionSchema = z.object({
  active: z.boolean(),
  isAdmin: z.boolean(),
  daysLeft: z.union([z.number(), z.string()]),
  expiresAt: z.number().nullable(),
  expDate: z.string().nullable(),
});
export type Subscription = z.infer<typeof subscriptionSchema>;

export const subscriptionResponseSchema = z.object({
  success: z.boolean(),
  userId: z.string(),
  subscription: subscriptionSchema,
});

/** What our own GET /api/subscription returns for the signed-in user. */
export type SubscriptionStatus = {
  active: boolean;
  isAdmin: boolean;
  daysLeft: number | string;
  expDate: string | null;
  expiresAt: number | null;
  /** The service couldn't be reached, so `active` is unknown rather than false. */
  unavailable: boolean;
};

/* ---------- Telegram ---------- */
export const telegramUserSchema = z.object({
  id: z.string(),
  firstName: z.string().nullish(),
  lastName: z.string().nullish(),
  username: z.string().nullish(),
  photoUrl: z.string().nullish(),
  phoneNumber: z.string().nullish(),
  authDate: z.number(),
});
export type TelegramUser = z.infer<typeof telegramUserSchema>;

/* ---------- Code generation ---------- */
/** Football slips come in up to four tiers. An unknown tier from a newer API is treated as none. */
export const TIERS = ["rookie", "hustler", "high_roller", "legend"] as const;
export const tierSchema = z.enum(TIERS);
export type Tier = z.infer<typeof tierSchema>;

export const sportyCodeSchema = z.object({
  code: z.string(),
  url: httpUrl,
  odds: z.number(),
  legsCount: z.number(),
  sport: z.string(),
  /** Football only. */
  tier: tierSchema.optional().catch(undefined),
  tierName: z.string().optional(),
  /** Football only: estimated chance (0-1). Internal use only, never shown to users. */
  jointProb: z.number().optional(),
  /** High Roller and Legend only. */
  highRisk: z.boolean().optional(),
  /** Football: at least one leg was checked against live team stats. */
  statsVerified: z.boolean().optional(),
});
export type SportyCode = z.infer<typeof sportyCodeSchema>;

/** Why a football tier produced no slip. */
export const noSafeSlipTierSchema = z.object({
  tier: tierSchema,
  tierName: z.string().optional(),
  reasons: z.array(z.string()).default([]),
  refreshDropped: z.array(z.string()).default([]),
});
export type NoSafeSlipTier = z.infer<typeof noSafeSlipTierSchema>;

const generatedSchema = z.object({
  success: z.literal(true),
  sport: sportSchema,
  count: z.number(),
  cached: z.boolean().optional(),
  codes: z.array(sportyCodeSchema),
  /** Football: an entry per missing tier. Not shown to users. */
  lines: z.array(z.string()).optional(),
  noSafeSlip: z.array(noSafeSlipTierSchema).optional(),
  generatedAt: z.string().optional(),
});
const nothingQualifiedSchema = z.object({
  success: z.literal(false),
  sport: sportSchema.optional(),
  count: z.number().optional(),
  message: z.string().optional(),
  error: z.string().optional(),
  /** Football, when no tier cleared its safety bar. A normal outcome, not an error. */
  noSafeSlip: z.array(noSafeSlipTierSchema).optional(),
  lines: z.array(z.string()).optional(),
});
export const generateResultSchema = z.discriminatedUnion("success", [
  generatedSchema,
  nothingQualifiedSchema,
]);
export type GenerateResult = z.infer<typeof generateResultSchema>;

/** Body accepted by our own POST /api/generate. */
export const generateRequestSchema = z.object({
  sport: sportSchema,
  fresh: z.boolean().optional(),
});
export type GenerateRequest = z.infer<typeof generateRequestSchema>;

/* ---------- Quest Special (live vFootball scanner) ---------- */
export const QUEST_MODES = ["any", "handicap", "ou"] as const;
export const questModeSchema = z.enum(QUEST_MODES);
export type QuestMode = z.infer<typeof questModeSchema>;

/** Body accepted by our own POST /api/quest-special/start. */
export const questStartRequestSchema = z.object({
  mode: questModeSchema.default("any"),
  legs: z.number().int().min(1).max(10).default(1),
});
export type QuestStartRequest = z.infer<typeof questStartRequestSchema>;

/** One picked leg: a whole single-leg result has the same fields, plus the slip's code. */
const questLegSchema = z.object({
  home: z.string(),
  away: z.string(),
  league: z.string().optional(),
  minute: z.number(),
  homeScore: z.number(),
  awayScore: z.number(),
  odds: z.number().optional(),
  description: z.string().optional(),
  reasoning: z.string().optional(),
  /** Model probability (0-1) and safety score (0-100). */
  prob: z.number().optional(),
  safetyScore: z.number().optional(),
  analysis: z
    .object({
      window: z.string().optional(),
      type: z.string().optional(),
      description: z.string().optional(),
      odds: z.number().optional(),
      reasoning: z.string().optional(),
    })
    .optional(),
});
export type QuestLeg = z.infer<typeof questLegSchema>;

const questSlipBase = {
  /** null when a slip qualified but SportyBet didn't mint a code. */
  code: z.string().nullable(),
  url: httpUrl.nullable(),
  jointProb: z.number().optional(),
  mode: z.string().optional(),
  timestamp: z.number(),
};

const questSingleSchema = questLegSchema.extend({ isMultiLeg: z.literal(false).optional(), ...questSlipBase });
const questMultiSchema = z.object({
  isMultiLeg: z.literal(true),
  legsCount: z.number().optional(),
  totalOdds: z.number().optional(),
  legs: z.array(questLegSchema),
  ...questSlipBase,
});

/** Why a cycle ended without a slip. Absent/null when no match was inside a window. */
const noSafeSlipSchema = z
  .object({
    reasons: z.array(z.string()).default([]),
    considered: z.number().optional(),
    inWindow: z.number().optional(),
    rejected: z.record(z.string(), z.number()).optional(),
    timestamp: z.number().optional(),
  })
  .nullish();
export type NoSafeSlip = z.infer<typeof noSafeSlipSchema>;

const questTimedOutSchema = z.object({
  timedOut: z.literal(true),
  timestamp: z.number(),
  noSafeSlip: noSafeSlipSchema,
});

/** A number for normal users, "Unlimited" for admins. */
const dailyCapSchema = z.union([z.number(), z.string()]);

export const questSpecialStatusSchema = z.object({
  success: z.boolean(),
  active: z.boolean().optional(),
  mode: z.string().optional(),
  legs: z.number().optional(),
  scans: z.number().optional(),
  runningFor: z.number().optional(),
  dailyUsed: z.number().optional(),
  maxDaily: dailyCapSchema.optional(),
  isUnlimited: z.boolean().optional(),
  lastResult: z.union([questMultiSchema, questSingleSchema, questTimedOutSchema]).nullish(),
  error: z.string().optional(),
});
export type QuestSpecialStatus = z.infer<typeof questSpecialStatusSchema>;
export type QuestSlip = z.infer<typeof questSingleSchema> | z.infer<typeof questMultiSchema>;

export const questSpecialStartSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
  error: z.string().optional(),
  dailyUsed: z.number().optional(),
  maxDaily: dailyCapSchema.optional(),
  isUnlimited: z.boolean().optional(),
});
export type QuestSpecialStart = z.infer<typeof questSpecialStartSchema>;

export const questSpecialStopSchema = z.object({
  success: z.boolean(),
  stopped: z.boolean().optional(),
  message: z.string().optional(),
});

/** True when a status result is a found slip (single or multi-leg) rather than a timeout. */
export function isQuestSignal(result: QuestSpecialStatus["lastResult"]): result is QuestSlip {
  return !!result && !("timedOut" in result);
}

/* ---------- Analytics ---------- */
export const globalStatsSchema = z.object({
  success: z.boolean(),
  data: z.object({
    totalSlips: z.number(),
    boomed: z.number(),
    lost: z.number(),
    pending: z.number(),
    overallBoomRate: z.string(),
    overallBoomRateNum: z.number(),
    bySport: z.record(z.string(), sportStatsSchema),
    /** Quest Special slips, also present under bySport.quest_special. */
    questSpecial: sportStatsSchema.optional(),
    recentBoomed: z.array(
      z.object({
        code: z.string(),
        sport: z.string(),
        odds: z.number(),
        legs: z.number(),
        settledAt: z.string(),
      }),
    ),
  }),
});
export type GlobalStats = z.infer<typeof globalStatsSchema>["data"];

export const recentSlipSchema = z.object({
  code: z.string(),
  sport: z.string(),
  odds: z.number(),
  status: slipStatusSchema,
  legs: z.number(),
  createdAt: z.string(),
  settledAt: z.string().nullable(),
});
export type RecentSlip = z.infer<typeof recentSlipSchema>;

export const userStatsSchema = z.object({
  success: z.boolean(),
  data: z.object({
    userId: z.string(),
    totalSlips: z.number(),
    boomed: z.number(),
    lost: z.number(),
    pending: z.number(),
    boomRate: z.string(),
    boomRateNum: z.number(),
    bestBoom: z
      .object({ code: z.string(), odds: z.number(), sport: z.string(), date: z.string() })
      .nullable(),
    bySport: z.record(z.string(), sportStatsSchema),
    questSpecial: sportStatsSchema.optional(),
    recentSlips: z.array(recentSlipSchema),
  }),
});
export type UserStats = z.infer<typeof userStatsSchema>["data"];

/** The docs don't show this feed's item shape, so only the essentials are required. */
export const latestSlipSchema = z.object({
  code: z.string(),
  sport: z.string().optional(),
  odds: z.number().optional(),
  legs: z.number().optional(),
  status: slipStatusSchema.optional(),
  createdAt: z.string().optional(),
});
export type LatestSlip = z.infer<typeof latestSlipSchema>;
export const latestSlipsSchema = z.object({
  success: z.boolean(),
  data: z.array(latestSlipSchema),
});

/* ---------- Payments ---------- */
export const checkoutSchema = z.object({
  success: z.boolean(),
  error: z.string().optional(),
  reference: z.string().optional(),
  checkoutUrl: httpUrl.optional(),
  amount: z.number().optional(),
  virtualAccount: z
    .object({
      bankName: z.string(),
      accountNumber: z.string(),
      accountName: z.string(),
      expiresAt: z.string().optional(),
    })
    .optional(),
});
export type Checkout = z.infer<typeof checkoutSchema>;

export const paymentStatusSchema = z.object({
  success: z.boolean(),
  status: z.string().optional(),
  message: z.string().optional(),
  chatId: z.string().optional(),
  reference: z.string().optional(),
  amount: z.number().optional(),
  /** True when this reference was credited earlier. A normal, successful outcome. */
  alreadyCredited: z.boolean().optional(),
});
export type PaymentStatus = z.infer<typeof paymentStatusSchema>;

/** What our own /api/payment/[reference] returns: the checkout status plus the live subscription. */
export type PaymentCheck = {
  /** "paid" once the external API confirms it; anything else (e.g. "unpaid") means not yet. */
  status: string;
  message?: string;
  alreadyCredited?: boolean;
  /** null when the subscription lookup failed (don't treat that as "not subscribed"). */
  subscription: Subscription | null;
};
