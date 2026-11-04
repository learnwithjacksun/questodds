"use client";

import { useRouter } from "next/navigation";

export function LogoutButton({
  className = "qo-btn-primary",
  children = "Sign out",
  onDone,
}: {
  className?: string;
  children?: React.ReactNode;
  onDone?: () => void;
}) {
  const router = useRouter();
  return (
    <button
      type="button"
      className={className}
      onClick={async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        onDone?.();
        router.replace("/login");
        router.refresh();
      }}
    >
      {children}
    </button>
  );
}
