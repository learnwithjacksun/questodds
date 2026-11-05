/**
 * The one VIP plan. Every price or duration shown in the UI comes from here, so the landing page,
 * the dashboard and the locked screens can never disagree. (The payment API stays authoritative
 * for what to actually transfer; the Upgrade page warns if it ever quotes something different.)
 */
export const VIP_PRICE_NGN = 1000;
export const VIP_DAYS = 7;

export function formatNaira(amount: number): string {
  return `₦${amount.toLocaleString("en-NG")}`;
}

export const VIP_PRICE_LABEL = formatNaira(VIP_PRICE_NGN);
/** e.g. "₦1,000 for 7 days" */
export const VIP_PRICE_SUMMARY = `${VIP_PRICE_LABEL} for ${VIP_DAYS} days`;

export const VIP_FEATURES = [
  "Football, eFootball and vFootball booking codes",
  "Quest Special live scanner, up to 20 scans a day",
  "One plan for the website and the Telegram bot",
] as const;

/** Plain-language terms, shown wherever the price is. */
export const VIP_TERMS = {
  oneTime: "One-time payment. It doesn't renew automatically.",
  early: `Renew early and the ${VIP_DAYS} days are added to your remaining time.`,
  method: "Paid by bank transfer in naira.",
  free: "Creating an account is free. VIP is needed to generate codes.",
} as const;
