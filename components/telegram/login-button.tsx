"use client";

import { useEffect, useId, useRef } from "react";
import type { TelegramAuthPayload } from "@/lib/sporty/schemas";

const BOT_USERNAME = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || "my_sporty_daily_bot";

declare global {
  interface Window {
    [key: `qoTelegramAuth_${string}`]: ((user: TelegramAuthPayload) => void) | undefined;
  }
}

/** Telegram's official Login Widget. It only renders on a domain registered via BotFather /setdomain. */
export function TelegramLoginButton({ onAuth }: { onAuth: (user: TelegramAuthPayload) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const callbackName = `qoTelegramAuth_${useId().replace(/\W/g, "")}` as const;

  // Keep the latest handler without re-injecting the widget script on every render.
  const handler = useRef(onAuth);
  useEffect(() => {
    handler.current = onAuth;
  });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    window[callbackName] = (user) => handler.current(user);

    const script = document.createElement("script");
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.async = true;
    script.dataset.telegramLogin = BOT_USERNAME;
    script.dataset.size = "large";
    script.dataset.radius = "20";
    script.dataset.userpic = "false";
    script.dataset.requestAccess = "write";
    script.dataset.onauth = `${callbackName}(user)`;
    container.appendChild(script);

    return () => {
      delete window[callbackName];
      container.replaceChildren();
    };
  }, [callbackName]);

  return <div ref={containerRef} className="qo-tg-widget" />;
}
