"use client";

import { useState } from "react";
import { toast } from "sonner";
import { postJson } from "@/lib/http";

/** Emails are masked by default. Showing the full address is a logged action. */
export function RevealEmail({ userId, masked }: { userId: string; masked: string }) {
  const [email, setEmail] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (email) return <span>{email}</span>;
  return (
    <span className="qo-admin-reveal">
      {masked}{" "}
      <button
        type="button"
        className="qo-text-btn"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            const res = await postJson<{ email: string }>(`/api/admin/users/${userId}`, { action: "reveal_email" });
            setEmail(res.email);
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "Couldn't reveal");
          } finally {
            setBusy(false);
          }
        }}
      >
        Reveal
      </button>
    </span>
  );
}
