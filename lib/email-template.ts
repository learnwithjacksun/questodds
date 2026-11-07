import "server-only";
import { TELEGRAM_BOT_URL } from "@/lib/links";
import { SITE_URL } from "@/lib/site";
import { SUPPORT_CONTACTS, whatsappLink } from "@/lib/support";

/** A fixed year: the template is built per send, but keep it in step with the site footer. */
const YEAR = 2026;

const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
const INK = "#111111";
const MUTED = "#6b6b6b";
const FAINT = "#8a8a8a";

type EmailContent = {
  /** Short text some inboxes show next to the subject. */
  preheader: string;
  heading: string;
  /** Intro line(s) above the code. Trusted HTML written in this repo, never user input. */
  intro: string;
  /** The one-time code, shown large with no box around it. */
  code: string;
  /** Small print under the code (expiry, "ignore this email"). */
  note: string;
  /** Why they got this email, shown in the footer. */
  reason: string;
};

/**
 * Plain, branded transactional email: logo and name on top, content, then a footer.
 * Table layout and inline styles because mail clients ignore most modern CSS. The logo is a PNG on
 * the public site, since Gmail and Outlook don't show SVG.
 */
export function renderEmail(c: EmailContent): string {
  const support = SUPPORT_CONTACTS.map(
    (s) => `<a href="${whatsappLink(s.number)}" style="color:${MUTED};text-decoration:underline">${s.name} on WhatsApp</a>`,
  ).join(" &nbsp;·&nbsp; ");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<title>${c.heading}</title>
</head>
<body style="margin:0;padding:0;background:#ffffff">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:#ffffff">${c.preheader}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff">
<tr><td align="center" style="padding:32px 20px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;font-family:${FONT};color:${INK}">

<tr><td style="padding-bottom:28px">
<a href="${SITE_URL}" style="text-decoration:none;color:${INK}">
<img src="${SITE_URL}/logo-email.png" width="46" height="28" alt="" style="vertical-align:middle;border:0">
<span style="vertical-align:middle;font-size:20px;font-weight:700;letter-spacing:-0.02em;margin-left:8px">Quest Codes</span>
</a>
</td></tr>

<tr><td style="font-size:22px;font-weight:700;letter-spacing:-0.02em;line-height:1.3;padding-bottom:12px">${c.heading}</td></tr>
<tr><td style="font-size:15px;line-height:1.6;color:#333333;padding-bottom:8px">${c.intro}</td></tr>
<tr><td style="font-size:36px;font-weight:700;letter-spacing:0.35em;padding:14px 0 14px">${c.code}</td></tr>
<tr><td style="font-size:14px;line-height:1.6;color:${MUTED};padding-bottom:32px">${c.note}</td></tr>

<tr><td style="border-top:1px solid #e6e6e6;padding-top:20px;font-size:12px;line-height:1.7;color:${FAINT}">
<strong style="color:${INK}">Quest Codes</strong><br>
SportyBet booking codes on the web and in Telegram.<br>
<a href="${SITE_URL}" style="color:${MUTED};text-decoration:underline">Website</a> &nbsp;·&nbsp;
<a href="${TELEGRAM_BOT_URL}" style="color:${MUTED};text-decoration:underline">Telegram bot</a> &nbsp;·&nbsp;
${support}
<br><br>
${c.reason}
<br><br>
Quest Codes is an independent platform and is not affiliated with, associated with, endorsed by, or officially connected to SportyBet. SportyBet is a trademark of its respective owner.<br>
Gambling involves risk. You must be 18 or older. Please bet responsibly.
<br><br>
&copy; ${YEAR} Quest Codes. All rights reserved.
</td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}
