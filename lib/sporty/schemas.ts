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

export const telegramAuthResponseSchema = z.object({
  success: z.boolean(),
  error: z.string().optional(),
  user: telegramUserSchema.optional(),
  subscription: subscriptionSchema.optional(),
});

/* ---------- Code generation ---------- */
export const sportyCodeSchema = z.object({
  code: z.string(),
  url: httpUrl,
  odds: z.number(),
  legsCount: z.number(),
  sport: z.string(),
});
export type SportyCode = z.infer<typeof sportyCodeSchema>;

const generatedSchema = z.object({
  success: z.literal(true),
  sport: sportSchema,
  count: z.number(),
  cached: z.boolean().optional(),
  codes: z.array(sportyCodeSchema),
  generatedAt: z.string().optional(),
});
const nothingQualifiedSchema = z.object({
  success: z.literal(false),
  sport: sportSchema.optional(),
  count: z.number().optional(),
  message: z.string().optional(),
  error: z.string().optional(),
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
});
export type PaymentStatus = z.infer<typeof paymentStatusSchema>;
