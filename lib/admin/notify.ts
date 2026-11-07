import "server-only";
import { connectDB } from "@/lib/db";
import { renderEmail } from "@/lib/email-template";
import { sendEmail } from "@/lib/mail";
import { ownerIds } from "@/lib/auth/roles";
import { Payment } from "@/lib/models/payment";
import { User } from "@/lib/models/user";
import { formatNaira, VIP_DAYS } from "@/lib/plan";
import { SITE_URL } from "@/lib/site";
import { getSubscription } from "@/lib/sporty/client";
import { paymentIssueMessage, SUPPORT_CONTACTS, whatsappLink } from "@/lib/support";

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

/**
 * Receipt for the person who paid. Best effort like the owner alerts: it never throws and never
 * affects the payment. Sent from markPaid, so it goes out once per payment, and again by hand from
 * the admin area. Returns whether the email was handed to the mail service.
 */
export async function sendReceipt(p: { userId: string; reference: string; amount: number }): Promise<boolean> {
  try {
    await connectDB();
    const user = await User.findById(p.userId).select("username email").lean();
    if (!user) return false;

    // The plan dates are a nicety: send the receipt even if the lookup fails.
    const sub = await getSubscription(p.userId).catch(() => null);
    const plan = [
      `Plan: VIP, ${VIP_DAYS} days`,
      sub?.expDate ? `Active until: ${escapeHtml(sub.expDate)}` : null,
      sub?.active ? `Days left: ${escapeHtml(String(sub.daysLeft))}` : null,
    ]
      .filter(Boolean)
      .join("<br>");

    const support = SUPPORT_CONTACTS.map(
      (s) =>
        `<a href="${whatsappLink(s.number, paymentIssueMessage(p.reference))}" style="color:#111111">${s.name} on WhatsApp</a>`,
    ).join(" or ");

    const subject = `Your Quest Codes payment receipt (${formatNaira(p.amount)})`;
    if (!process.env.BREVO_API_KEY && process.env.NODE_ENV !== "production") {
      console.log(`[receipt] ${subject} -> ${user.email}`);
      return true;
    }
    await sendEmail({
      to: user.email,
      subject,
      html: renderEmail({
        preheader: `We received your payment of ${formatNaira(p.amount)}. Your VIP is active.`,
        heading: "Payment received",
        intro: `Thanks, ${escapeHtml(user.username)}. We received your payment of <strong>${escapeHtml(formatNaira(p.amount))}</strong>.<br><br>${plan}<br>Reference: ${escapeHtml(p.reference)}`,
        note: `<a href="${SITE_URL}/dashboard" style="color:#111111">Open your dashboard</a> to generate codes. Want the same plan in the Telegram bot? Link Telegram in Settings. There is no second payment.<br><br>Problem with this payment? Message ${support}.`,
        reason: "You received this email because you made a payment on Quest Codes.",
      }),
    });
    await Payment.updateOne({ reference: p.reference }, { receiptSentAt: new Date() });
    return true;
  } catch (err) {
    console.error("[receipt] couldn't email the receipt", err);
    return false;
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

export async function notifyPayment(p: {
  userId: string;
  reference: string;
  amount: number;
  /** Set when something looks wrong, e.g. a payment that added too many days. */
  warning?: string;
}) {
  let who = "A user";
  try {
    await connectDB();
    const user = await User.findById(p.userId).select("username email").lean();
    if (user) who = `<strong>${escapeHtml(user.username)}</strong> (${escapeHtml(user.email)})`;
  } catch {
    // Still worth sending without the name.
  }
  await notifyOwners(
    `${p.warning ? "Check this payment" : "Payment received"}: ${formatNaira(p.amount)}`,
    p.warning ? "Payment received, needs a check" : "Payment received",
    `${who} paid <strong>${escapeHtml(formatNaira(p.amount))}</strong> for VIP.${
      p.warning ? `<br><strong>${escapeHtml(p.warning)}</strong>` : ""
    }`,
    `Reference: ${escapeHtml(p.reference)}`,
  );
}
