import "server-only";
import { connectDB } from "@/lib/db";
import { renderEmail } from "@/lib/email-template";
import { sendEmail } from "@/lib/mail";
import { ownerIds } from "@/lib/auth/roles";
import { User } from "@/lib/models/user";
import { formatNaira } from "@/lib/plan";

const escapeHtml = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/**
 * Owners to notify: accounts with the owner role, accounts whose linked Telegram ID is in
 * OWNER_TELEGRAM_IDS, plus any extra addresses in OWNER_NOTIFY_EMAILS (comma separated).
 */
async function ownerEmails(): Promise<string[]> {
  await connectDB();
  const owners = await User.find({
    status: { $ne: "suspended" },
    $or: [{ role: "owner" }, { telegramId: { $in: [...ownerIds()] } }],
  })
    .select("email")
    .lean();
  const extra = (process.env.OWNER_NOTIFY_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return [...new Set([...owners.map((o) => o.email), ...extra])];
}

/** Email every owner. Best effort: never throws, because a failed alert must not affect sign-up or payment. */
async function notifyOwners(subject: string, heading: string, intro: string, note: string) {
  try {
    const to = await ownerEmails();
    if (to.length === 0) return;

    if (!process.env.BREVO_API_KEY && process.env.NODE_ENV !== "production") {
      console.log(`[notify] ${subject} -> ${to.join(", ")}`);
      return;
    }
    const html = renderEmail({
      preheader: subject,
      heading,
      intro,
      note,
      reason: "You received this email because you are an owner of Quest Codes.",
    });
    // One email each, so owners don't see each other's addresses in the header.
    await Promise.allSettled(to.map((address) => sendEmail({ to: address, subject, html })));
  } catch (err) {
    console.error("[notify] couldn't email owners", err);
  }
}

export async function notifyNewUser(user: { username: string; email: string }) {
  let total = "";
  try {
    await connectDB();
    total = `Total users: ${await User.countDocuments()}.`;
  } catch {
    // The count is a nicety.
  }
  await notifyOwners(
    `New user: ${user.username}`,
    "New user registered",
    `<strong>${escapeHtml(user.username)}</strong> (${escapeHtml(user.email)}) just created an account.`,
    total,
  );
}

export async function notifyPayment(p: { userId: string; reference: string; amount: number }) {
  let who = "A user";
  try {
    await connectDB();
    const user = await User.findById(p.userId).select("username email").lean();
    if (user) who = `<strong>${escapeHtml(user.username)}</strong> (${escapeHtml(user.email)})`;
  } catch {
    // Still worth sending without the name.
  }
  await notifyOwners(
    `Payment received: ${formatNaira(p.amount)}`,
    "Payment received",
    `${who} paid <strong>${escapeHtml(formatNaira(p.amount))}</strong> for VIP.`,
    `Reference: ${escapeHtml(p.reference)}`,
  );
}
