import "server-only";
import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { AdminChallenge } from "@/lib/models/admin-challenge";
import { renderEmail } from "@/lib/email-template";
import { sendEmail } from "@/lib/mail";

export const ADMIN_CODE_TTL_MS = 10 * 60 * 1000;
export const ADMIN_RESEND_COOLDOWN_MS = 60 * 1000;
export const ADMIN_MAX_ATTEMPTS = 3;
export const ADMIN_LOCK_MS = 15 * 60 * 1000;

function hash(userId: string, code: string) {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not defined");
  return createHmac("sha256", secret).update(`admin:${userId}:${code}`).digest("hex");
}

export type IssueResult = { ok: true } | { ok: false; reason: "cooldown" | "locked"; seconds: number };

export async function issueAdminCode(userId: string, email: string): Promise<IssueResult> {
  const now = Date.now();
  const existing = await AdminChallenge.findOne({ userId }).lean();
  if (existing?.lockedUntil && existing.lockedUntil.getTime() > now) {
    return { ok: false, reason: "locked", seconds: Math.ceil((existing.lockedUntil.getTime() - now) / 1000) };
  }
  if (existing && existing.createdAt.getTime() + ADMIN_RESEND_COOLDOWN_MS > now) {
    const wait = existing.createdAt.getTime() + ADMIN_RESEND_COOLDOWN_MS - now;
    return { ok: false, reason: "cooldown", seconds: Math.ceil(wait / 1000) };
  }

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  await AdminChallenge.findOneAndUpdate(
    { userId },
    {
      userId,
      codeHash: hash(userId, code),
      attempts: 0,
      $unset: { lockedUntil: 1 },
      createdAt: new Date(now),
      expiresAt: new Date(now + ADMIN_CODE_TTL_MS),
    },
    { upsert: true },
  );

  if (!process.env.BREVO_API_KEY && process.env.NODE_ENV !== "production") {
    console.log(`[admin] dev code for ${email}: ${code}`);
    return { ok: true };
  }
  await sendEmail({
    to: email,
    subject: `${code} is your Quest Codes admin code`,
    html: renderEmail({
      preheader: `Your Quest Codes admin code is ${code}. It expires in 10 minutes.`,
      heading: "Admin sign-in code",
      intro: "Enter this code to open the Quest Codes admin area.",
      code,
      note: "It expires in 10 minutes. If you did not just open the admin area, someone is signed in to your account. Change your email password and tell the other admins.",
      reason: "You received this email because the admin area was opened with your account.",
    }),
  });
  return { ok: true };
}

export type VerifyResult =
  | { ok: true }
  | { ok: false; reason: "invalid" | "locked"; attemptsLeft?: number; seconds?: number };

export async function verifyAdminCode(userId: string, code: string): Promise<VerifyResult> {
  const now = Date.now();
  const challenge = await AdminChallenge.findOne({ userId });
  if (!challenge || challenge.expiresAt.getTime() < now) return { ok: false, reason: "invalid" };

  if (challenge.lockedUntil && challenge.lockedUntil.getTime() > now) {
    return { ok: false, reason: "locked", seconds: Math.ceil((challenge.lockedUntil.getTime() - now) / 1000) };
  }

  const a = Buffer.from(hash(userId, code));
  const b = Buffer.from(challenge.codeHash);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    challenge.attempts += 1;
    if (challenge.attempts >= ADMIN_MAX_ATTEMPTS) {
      challenge.lockedUntil = new Date(now + ADMIN_LOCK_MS);
      await challenge.save();
      return { ok: false, reason: "locked", seconds: ADMIN_LOCK_MS / 1000 };
    }
    await challenge.save();
    return { ok: false, reason: "invalid", attemptsLeft: ADMIN_MAX_ATTEMPTS - challenge.attempts };
  }

  await challenge.deleteOne();
  return { ok: true };
}
