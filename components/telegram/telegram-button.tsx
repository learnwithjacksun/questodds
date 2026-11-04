/** Starts Telegram's OpenID Connect flow. A plain link: it's a full-page redirect to Telegram. */
export function TelegramButton({
  intent,
  className = "qo-btn-ghost",
  children,
}: {
  intent: "login" | "link";
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <a href={`/api/auth/telegram/start?intent=${intent}`} className={className}>
      {children}
    </a>
  );
}
