export type SupportContact = { name: string; number: string };

/** WhatsApp numbers in international format, no "+". */
export const SUPPORT_CONTACTS: readonly SupportContact[] = [
  { name: "Wright", number: "2347089464098" },
  { name: "Jackson", number: "2348137411338" },
];

export const SUPPORT_MESSAGE = "Hello, I have an issue...";

/** Opening line for a payment problem, with the reference so support can find it quickly. */
export const paymentIssueMessage = (reference: string) =>
  `${SUPPORT_MESSAGE} My payment reference is ${reference}.`;

/** wa.me deep link that opens WhatsApp with the message already typed. */
export function whatsappLink(number: string, message: string = SUPPORT_MESSAGE): string {
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}
