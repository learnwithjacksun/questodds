import type { Metadata } from "next";
import { AuthForm } from "@/components/auth/auth-form";

export const metadata: Metadata = { title: "Create account – Quest Codes" };

export default function RegisterPage() {
  return <AuthForm mode="register" />;
}
