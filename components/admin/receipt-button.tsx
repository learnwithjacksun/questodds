"use client";

import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { postJson } from "@/lib/http";

/** Emails the payer their receipt. `sent` says whether one already went out, to label the button. */
export function ReceiptButton({ reference, sent }: { reference: string; sent: boolean }) {
  const router = useRouter();
  const send = useMutation({
    mutationFn: () => postJson(`/api/admin/payments/${encodeURIComponent(reference)}/receipt`),
    onSuccess: () => {
      toast.success("Receipt sent.");
      router.refresh();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <button
      type="button"
      className="qo-text-btn"
      disabled={send.isPending}
      onClick={() => {
        if (sent && !window.confirm("A receipt was already sent for this payment. Send it again?")) return;
        send.mutate();
      }}
    >
      {send.isPending ? "Sending…" : sent ? "Resend receipt" : "Send receipt"}
    </button>
  );
}
