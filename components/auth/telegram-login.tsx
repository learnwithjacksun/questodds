"use client";

import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { TelegramLoginButton } from "@/components/telegram/login-button";
import { postJson } from "@/lib/http";
import type { TelegramAuthPayload } from "@/lib/sporty/schemas";

export function TelegramLogin() {
  const router = useRouter();
  const login = useMutation({
    mutationFn: (user: TelegramAuthPayload) => postJson("/api/auth/telegram", user),
    onSuccess: () => {
      toast.success("Welcome back!");
      router.replace("/dashboard");
      router.refresh();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <div className="qo-tg-login" aria-busy={login.isPending}>
      <div className="qo-divider">
        <span>or</span>
      </div>
      <TelegramLoginButton onAuth={(user) => login.mutate(user)} />
      <p className="qo-hint">Works for accounts that already linked Telegram in Settings.</p>
    </div>
  );
}
