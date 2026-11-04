"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { TelegramLogo } from "@/components/telegram/logo";
import { TelegramButton } from "@/components/telegram/telegram-button";
import { deleteJson } from "@/lib/http";

export function TelegramCard({
  linked,
  clientId,
}: {
  linked: { username: string | null } | null;
  clientId?: string;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);

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
          <TelegramLogo size={26} />
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
          {confirming && (
            <p className="qo-fine">You won&apos;t be able to generate codes here until you link again.</p>
          )}
        </>
      ) : (
        <>
          <p>
            Link your Telegram account to use your subscription here. If you already subscribed in the
            bot, it unlocks the website automatically.
          </p>
          <div className="qo-card-actions">
            <TelegramButton intent="link" clientId={clientId} className="qo-btn-primary qo-btn-sm">
              Link Telegram
            </TelegramButton>
          </div>
        </>
      )}
    </div>
  );
}
