"use client";

import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { postJson } from "@/lib/http";

/** Asks the payment service about one payment again and refreshes the page with the result. */
export function ReverifyButton({ reference }: { reference: string }) {
  const router = useRouter();
  const verify = useMutation({
    mutationFn: () =>
      postJson<{ status: string }>(`/api/admin/payments/${encodeURIComponent(reference)}/verify`),
    onSuccess: (data) => {
      if (data.status === "paid") toast.success("Confirmed paid. Record updated.");
      else toast.info("The payment service doesn't show this as paid yet.");
      router.refresh();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <button type="button" className="qo-text-btn" disabled={verify.isPending} onClick={() => verify.mutate()}>
      {verify.isPending ? "Checking…" : "Re-verify"}
    </button>
  );
}
