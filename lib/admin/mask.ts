/** "jane.doe@gmail.com" -> "j***@gmail.com". Staff see this by default; revealing the full address is logged. */
export function maskEmail(email: string): string {
  const [name = "", domain = ""] = email.split("@");
  return `${name.slice(0, 1)}***@${domain}`;
}
