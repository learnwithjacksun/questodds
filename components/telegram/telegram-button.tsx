/** Starts Telegram's login. A plain link, since it's a full-page redirect to Telegram and back. */
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
