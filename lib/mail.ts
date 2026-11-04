import "server-only";
import { BrevoClient } from "@getbrevo/brevo";

let client: BrevoClient | null = null;

function getClient() {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) throw new Error("BREVO_API_KEY is not defined");
  return (client ??= new BrevoClient({ apiKey }));
}

export async function sendEmail(opts: {
  to: string | string[];
  subject: string;
  html: string;
}) {
  const email = process.env.BREVO_SENDER_EMAIL;
  if (!email) throw new Error("BREVO_SENDER_EMAIL is not defined");

  const recipients = (Array.isArray(opts.to) ? opts.to : [opts.to]).map((e) => ({ email: e }));

  return getClient().transactionalEmails.sendTransacEmail({
    subject: opts.subject,
    htmlContent: opts.html,
    sender: { name: process.env.BREVO_SENDER_NAME ?? "QuestCodes", email },
    to: recipients,
  });
}
