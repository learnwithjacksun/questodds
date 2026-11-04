import { TelegramButton } from "@/components/telegram/telegram-button";

export function TelegramLogin({ clientId }: { clientId?: string }) {
  return (
    <div className="qo-tg-login">
      <div className="qo-divider">
        <span>or</span>
      </div>
      <TelegramButton intent="login" clientId={clientId} className="qo-btn-ghost qo-tg-btn">
        Continue with Telegram
      </TelegramButton>
      <p className="qo-hint">Works for accounts that already linked Telegram in Settings.</p>
    </div>
  );
}
