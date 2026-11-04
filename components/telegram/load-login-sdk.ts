const SCRIPT_SRC = "https://oauth.telegram.org/js/telegram-login.js";

export type TelegramLoginResult = {
  id_token?: string;
  user?: Record<string, unknown>;
  error?: string;
};

type TelegramLoginApi = {
  auth: (
    options: { client_id: number | string; scope?: string[] },
    callback: (result: TelegramLoginResult) => void,
  ) => void;
};

declare global {
  interface Window {
    Telegram?: { Login?: TelegramLoginApi };
  }
}

let loading: Promise<TelegramLoginApi> | null = null;

/** Load Telegram's official Login SDK once, then resolve with Telegram.Login. */
export function loadTelegramLoginSdk(): Promise<TelegramLoginApi> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Telegram Login is browser-only"));
  }
  if (window.Telegram?.Login) return Promise.resolve(window.Telegram.Login);
  if (loading) return loading;

  loading = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_SRC}"]`);
    if (existing) {
      existing.addEventListener("load", () => {
        if (window.Telegram?.Login) resolve(window.Telegram.Login);
        else reject(new Error("Telegram Login SDK failed to initialize"));
      });
      existing.addEventListener("error", () => reject(new Error("Couldn't load Telegram Login")));
      return;
    }

    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.async = true;
    script.onload = () => {
      if (window.Telegram?.Login) resolve(window.Telegram.Login);
      else reject(new Error("Telegram Login SDK failed to initialize"));
    };
    script.onerror = () => {
      loading = null;
      reject(new Error("Couldn't load Telegram Login"));
    };
    document.head.appendChild(script);
  });

  return loading;
}
