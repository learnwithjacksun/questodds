"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { HugeiconsIcon } from "@hugeicons/react";
import { TelegramIcon } from "@hugeicons/core-free-icons";
import { TelegramLoginButton } from "@/components/telegram/login-button";
import { deleteJson, postJson } from "@/lib/http";
import type { TelegramAuthPayload } from "@/lib/sporty/schemas";

export function TelegramCard({ linked }: { linked: { username: string | null } | null }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);

  const link = useMutation({
    mutationFn: (payload: TelegramAuthPayload) => postJson("/api/telegram/link", payload),
    onSuccess: () => {
      toast.success("Telegram linked.");
      router.refresh();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const unlink = useMutation({
    mutationFn: () => deleteJson("/api/telegram/link"),
    onSuccess: () => {
      toast.success("Telegram unlinked.");
      setConfirming(false);
      router.refresh();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <div className="qo-card">
      <div className="qo-card-top">
        <span className="qo-icon-badge" aria-hidden="true">
          <HugeiconsIcon icon={TelegramIcon} size={22} />
        </span>
      </div>
      <h3>Telegram</h3>

      {linked ? (
        <>
          <p>
            Linked{linked.username ? <> as <strong>@{linked.username}</strong></> : null}. Your VIP
            status is shared between the website and the Telegram bot.
          </p>
          <div className="qo-card-actions">
            {confirming ? (
              <>
                <button
                  type="button"
                  className="qo-btn-danger"
                  disabled={unlink.isPending}
                  onClick={() => unlink.mutate()}
                >
                  {unlink.isPending ? "Unlinking…" : "Yes, unlink"}
                </button>
                <button type="button" className="qo-btn-ghost" onClick={() => setConfirming(false)}>
                  Cancel
                </button>
              </>
            ) : (
              <button type="button" className="qo-btn-ghost" onClick={() => setConfirming(true)}>
                Unlink Telegram
              </button>
            )}
          </div>
          {confirming && <p className="qo-fine">You won&apos;t be able to generate codes here until you link again.</p>}
        </>
      ) : (
        <>
          <p>
            Link your Telegram account to use your subscription here. If you already subscribed in the
            bot, it unlocks the website automatically.
          </p>
          <div className="qo-card-actions" aria-busy={link.isPending}>
            <TelegramLoginButton onAuth={(user) => link.mutate(user)} />
          </div>
        </>
      )}
    </div>
  );
}
