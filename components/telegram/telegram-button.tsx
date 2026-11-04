"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { loadTelegramLoginSdk } from "@/components/telegram/load-login-sdk";
import { postJson } from "@/lib/http";

/**
 * Custom text button that opens Telegram's official Login popup (telegram-login.js)
 * and posts the resulting id_token to our API. No Telegram logo in the button.
 * @see https://core.telegram.org/bots/telegram-login
 */
export function TelegramButton({
  intent,
  clientId,
  className = "qo-btn-ghost",
  children,
}: {
  intent: "login" | "link";
  /** Numeric Client ID from BotFather; omit/empty → show unconfigured toast. */
  clientId?: string;
  className?: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [opening, setOpening] = useState(false);

  const login = useMutation({
    mutationFn: (idToken: string) => postJson("/api/auth/telegram", { id_token: idToken }),
    onSuccess: () => {
      toast.success("Welcome back!");
      router.replace("/dashboard");
      router.refresh();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const link = useMutation({
    mutationFn: (idToken: string) => postJson<{ ok: true; username: string | null }>("/api/telegram/link", {
      id_token: idToken,
    }),
    onSuccess: () => {
      toast.success("Telegram linked.");
      router.refresh();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const busy = opening || login.isPending || link.isPending;

  async function onClick() {
    if (busy) return;
    if (!clientId) {
      toast.error("Telegram sign-in isn't configured yet.");
      return;
    }

    setOpening(true);
    try {
      const sdk = await loadTelegramLoginSdk();
      sdk.auth({ client_id: clientId, scope: ["profile", "write"] }, (result) => {
        setOpening(false);
        if (result.error) {
          if (result.error !== "popup_closed") {
            toast.error("Telegram sign-in was cancelled.");
          }
          return;
        }
        if (!result.id_token) {
          toast.error("Telegram couldn't be verified. Try again.");
          return;
        }
        if (intent === "login") login.mutate(result.id_token);
        else link.mutate(result.id_token);
      });
    } catch (err) {
      setOpening(false);
      toast.error(err instanceof Error ? err.message : "Couldn't start Telegram sign-in.");
    }
  }

  return (
    <button type="button" className={className} disabled={busy} onClick={onClick}>
      {busy ? (intent === "link" ? "Linking…" : "Signing in…") : children}
    </button>
  );
}
