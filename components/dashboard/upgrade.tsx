"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowUpRight01Icon, CheckmarkCircle02Icon, Loading03Icon } from "@hugeicons/core-free-icons";
import { CopyButton } from "@/components/dashboard/copy-button";
import { getJson, postJson } from "@/lib/http";
import { formatWhen } from "@/lib/format";
import type { Checkout, PaymentStatus } from "@/lib/sporty/schemas";

const POLL_MS = 5000;
const MAX_POLLS = 120; // ~10 minutes

export function Upgrade({ active }: { active: boolean }) {
  const router = useRouter();
  const [checkout, setCheckout] = useState<Checkout | null>(null);
  const [checking, setChecking] = useState(false);

  const start = useMutation({
    mutationFn: () => postJson<Checkout>("/api/payment/initialize"),
    onSuccess: (data) => {
      setCheckout(data);
      setChecking(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const reference = checkout?.reference;
  const verify = useQuery({
    queryKey: ["payment", reference],
    queryFn: () => getJson<PaymentStatus>(`/api/payment/${encodeURIComponent(reference ?? "")}`),
    enabled: checking && !!reference,
    retry: false,
    refetchInterval: (q) =>
      q.state.data?.status === "paid" || q.state.dataUpdateCount >= MAX_POLLS ? false : POLL_MS,
  });

  const paid = verify.data?.status === "paid";
  useEffect(() => {
    if (paid) {
      toast.success("Payment confirmed. Your VIP is active.");
      router.refresh();
    }
  }, [paid, router]);

  if (paid) {
    return (
      <div className="qo-card qo-notice is-ok" role="status">
        <HugeiconsIcon icon={CheckmarkCircle02Icon} size={22} aria-hidden="true" />
        <p>Payment confirmed. You can now generate codes from the Generate page.</p>
      </div>
    );
  }

  const account = checkout?.virtualAccount;

  return (
    <div className="qo-upgrade">
      {!checkout && (
        <button
          type="button"
          className="qo-btn-primary qo-gen-btn"
          disabled={start.isPending}
          onClick={() => start.mutate()}
        >
          {start.isPending ? "Preparing payment…" : active ? "Extend subscription" : "Get VIP access"}
        </button>
      )}

      {checkout && (
        <div className="qo-card qo-checkout">
          <div className="qo-kv">
            <span>Amount</span>
            <strong>₦{(checkout.amount ?? 0).toLocaleString("en-NG")}</strong>
          </div>

          {account ? (
            <>
              <p className="qo-checkout-help">
                Transfer the exact amount to this account. It&apos;s generated for this payment only.
              </p>
              <div className="qo-kv">
                <span>Bank</span>
                <strong>{account.bankName}</strong>
              </div>
              <div className="qo-kv">
                <span>Account name</span>
                <strong>{account.accountName}</strong>
              </div>
              <div className="qo-kv">
                <span>Account number</span>
                <strong className="qo-mono">{account.accountNumber}</strong>
                <CopyButton value={account.accountNumber} />
              </div>
              {account.expiresAt && (
                <p className="qo-fine">Expires {formatWhen(account.expiresAt)}</p>
              )}
            </>
          ) : (
            <p className="qo-checkout-help">Use the checkout page to complete your payment.</p>
          )}

          <div className="qo-checkout-actions">
            <button
              type="button"
              className="qo-btn-primary qo-btn-sm"
              disabled={checking}
              onClick={() => setChecking(true)}
            >
              {checking ? (
                <>
                  <HugeiconsIcon icon={Loading03Icon} size={16} className="qo-spin" aria-hidden="true" />
                  Checking…
                </>
              ) : (
                "I've paid"
              )}
            </button>
            {checkout.checkoutUrl && (
              <a href={checkout.checkoutUrl} target="_blank" rel="noopener noreferrer" className="qo-btn-ghost">
                Open checkout page
                <HugeiconsIcon icon={ArrowUpRight01Icon} size={16} aria-hidden="true" />
              </a>
            )}
          </div>

          {checking && (
            <p className="qo-fine" role="status">
              {verify.isError
                ? verify.error.message
                : "Waiting for your transfer. This usually confirms within a minute. You can leave this page open."}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
