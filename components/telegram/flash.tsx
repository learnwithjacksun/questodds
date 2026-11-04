"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

type Flash = { kind: "success" | "error" | "info"; text: string };

/** Fixed messages keyed by code, so the URL can never inject arbitrary text. */
const MESSAGES: Record<string, Flash> = {
  linked: { kind: "success", text: "Telegram linked." },
  denied: { kind: "info", text: "Telegram sign-in was cancelled." },
  failed: { kind: "error", text: "Telegram couldn't be verified. Try again." },
  unavailable: { kind: "error", text: "The Telegram service is unavailable. Try again in a minute." },
  expired: { kind: "error", text: "That Telegram sign-in expired. Please try again." },
  taken: { kind: "error", text: "That Telegram account is already linked to another Quest Codes account." },
  not_linked: {
    kind: "error",
    text: "No account is linked to this Telegram. Sign in with email, then link it in Settings.",
  },
  signin: { kind: "info", text: "Sign in with your email first, then link Telegram in Settings." },
  unconfigured: { kind: "error", text: "Telegram sign-in isn't configured yet." },
};

/** Shows the result of the Telegram redirect (?tg=code) as a toast, then cleans the URL. */
export function TelegramFlash() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const code = params.get("tg");

  useEffect(() => {
    if (!code) return;
    const flash = MESSAGES[code];
    if (flash) toast[flash.kind](flash.text);
    router.replace(pathname, { scroll: false });
  }, [code, pathname, router]);

  return null;
}
