import "server-only";
import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { Otp } from "@/lib/models/otp";
import { renderEmail } from "@/lib/email-template";
import { sendEmail } from "@/lib/mail";

export const OTP_TTL_MS = 10 * 60 * 1000;
export const OTP_RESEND_COOLDOWN_MS = 60 * 1000;
export const OTP_MAX_ATTEMPTS = 5;

function hash(email: string, code: string) {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not defined");
  return createHmac("sha256", secret).update(`${email}:${code}`).digest("hex");
}

/** Seconds the caller must still wait before another code can be requested (0 = ok). */
export async function cooldownRemaining(email: string): Promise<number> {
  const existing = await Otp.findOne({ email }).select("createdAt").lean();
  if (!existing) return 0;
  const wait = existing.createdAt.getTime() + OTP_RESEND_COOLDOWN_MS - Date.now();
  return wait > 0 ? Math.ceil(wait / 1000) : 0;
}

export async function issueCode(
  email: string,
  pending?: { username: string; ageConfirmed: boolean },
) {
  const code = String(randomInt(0, 10000)).padStart(4, "0");
  const now = Date.now();

  await Otp.findOneAndUpdate(
    { email },
    {
      email,
      codeHash: hash(email, code),
      attempts: 0,
      username: pending?.username,
      ageConfirmed: pending?.ageConfirmed,
      createdAt: new Date(now),
      expiresAt: new Date(now + OTP_TTL_MS),
    },
    { upsert: true },
  );

  if (!process.env.BREVO_API_KEY && process.env.NODE_ENV !== "production") {
    console.log(`[auth] dev code for ${email}: ${code}`);
    return;
  }

  await sendEmail({
    to: email,
    subject: `${code} is your Quest Codes verification code`,
    html: renderEmail({
      preheader: `Your Quest Codes verification code is ${code}. It expires in 10 minutes.`,
      heading: "Your verification code",
      intro: "Enter this code to continue signing in to Quest Codes.",
      code,
      note: "It expires in 10 minutes. If you didn&rsquo;t request it, you can ignore this email.",
      reason: "You received this email because a verification code was requested for this address.",
    }),
  });
}

export type VerifyResult =
  | { ok: true; username?: string; ageConfirmed?: boolean }
  | { ok: false; reason: "invalid" | "locked" };

export async function verifyCode(email: string, code: string): Promise<VerifyResult> {
  const otp = await Otp.findOne({ email });
  if (!otp || otp.expiresAt.getTime() < Date.now()) return { ok: false, reason: "invalid" };

  if (otp.attempts >= OTP_MAX_ATTEMPTS) {
    await otp.deleteOne();
    return { ok: false, reason: "locked" };
  }

  const a = Buffer.from(hash(email, code));
  const b = Buffer.from(otp.codeHash);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    otp.attempts += 1;
    await otp.save();
    return { ok: false, reason: otp.attempts >= OTP_MAX_ATTEMPTS ? "locked" : "invalid" };
  }

  await otp.deleteOne();
  return { ok: true, username: otp.username ?? undefined, ageConfirmed: otp.ageConfirmed ?? undefined };
}
