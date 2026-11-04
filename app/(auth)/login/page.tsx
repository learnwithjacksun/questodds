import { Suspense } from "react";
import type { Metadata } from "next";
import { AuthForm } from "@/components/auth/auth-form";
import { TelegramFlash } from "@/components/telegram/flash";
import { telegramClientId } from "@/lib/telegram";

export const metadata: Metadata = { title: "Sign in – Quest Codes" };

export default function LoginPage() {
  return (
    <>
      <Suspense fallback={null}>
        <TelegramFlash />
      </Suspense>
      <AuthForm mode="login" telegramClientId={telegramClientId()} />
    </>
  );
}
