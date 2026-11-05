"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { HugeiconsIcon } from "@hugeicons/react";
import { CheckmarkCircle02Icon } from "@hugeicons/core-free-icons";
import { CheckoutPanel } from "@/components/dashboard/checkout-panel";
import { HowPaying, PlanCard } from "@/components/dashboard/plan-card";
import { getJson, postJson } from "@/lib/http";
import { VIP_PRICE_LABEL, VIP_PRICE_NGN } from "@/lib/plan";
import { checkoutSchema, type Checkout, type PaymentCheck } from "@/lib/sporty/schemas";

const POLL_MS = 5000;
const MAX_POLLS = 180; // ~15 minutes of automatic checking

/* ---------- Keep the checkout across refreshes ----------
 * A user who has already transferred must not lose the account/reference by reloading, and
 * clicking "pay" again would create a second virtual account. */
type Stored = { checkout: Checkout; paid: boolean };
const STORAGE_KEY = "qo-checkout-v1";
const listeners = new Set<() => void>();
let current: string | null = null;
let loaded = false;

function readRaw(): string | null {
  if (!loaded) {
    loaded = true;
    try {
      current = sessionStorage.getItem(STORAGE_KEY);
    } catch {
      /* storage blocked: fall back to memory only */
    }
  }
  return current;
}
function writeStored(value: Stored | null) {
  current = value ? JSON.stringify(value) : null;
  try {
    if (current) sessionStorage.setItem(STORAGE_KEY, current);
    else sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l());
}
function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}
function parseStored(raw: string | null): Stored | null {
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as { checkout?: unknown; paid?: unknown };
    const checkout = checkoutSchema.safeParse(data.checkout);
    return checkout.success && checkout.data.reference
      ? { checkout: checkout.data, paid: data.paid === true }
      : null;
  } catch {
    return null;
  }
}

export function Upgrade({
  active,
  baselineExpiresAt,
}: {
  active: boolean;
  /** Subscription end (epoch ms) when the page loaded: a later value means a renewal landed. */
  baselineExpiresAt: number | null;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const raw = useSyncExternalStore(subscribe, readRaw, () => null);
  const stored = parseStored(raw);
  const checkout = stored?.checkout ?? null;
  const reference = checkout?.reference;
  const account = checkout?.virtualAccount;

  const [manualTried, setManualTried] = useState(false);

  // The transfer account is single-use and expires; stop polling it and offer a fresh one.
  const expiresAtMs = account?.expiresAt ? Date.parse(account.expiresAt) : NaN;
  const [expired, setExpired] = useState(false);
  useEffect(() => {
    if (Number.isNaN(expiresAtMs)) return;
    const check = () => setExpired(Date.now() >= expiresAtMs);
    const first = setTimeout(check, 0);
    const id = setInterval(check, 5000);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, [expiresAtMs]);
  const lapsed = expired && !Number.isNaN(expiresAtMs);

  const start = useMutation({
    mutationFn: () => postJson<Checkout>("/api/payment/initialize"),
    onSuccess: (data) => {
      setManualTried(false);
      setExpired(false);
      writeStored({ checkout: data, paid: false });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Checks run on their own every few seconds; "I've paid" just forces one right now.
  const verify = useQuery({
    queryKey: ["payment", reference],
    queryFn: () => getJson<PaymentCheck>(`/api/payment/${encodeURIComponent(reference ?? "")}`),
    enabled: !!reference && !stored?.paid && !lapsed,
    retry: false,
    refetchOnWindowFocus: true,
    refetchInterval: (q) => (q.state.dataUpdateCount >= MAX_POLLS ? false : POLL_MS),
  });

  // Confirmed either by the checkout itself, or by the subscription extending (e.g. webhook credit).
  const sub = verify.data?.subscription;
  const renewed = !!sub?.active && (sub.expiresAt ?? 0) > (baselineExpiresAt ?? 0);
  const confirmed = verify.data?.status === "paid" || renewed;
  const paid = !!stored?.paid;

  useEffect(() => {
    if (confirmed && checkout && !paid) {
      writeStored({ checkout, paid: true });
      toast.success("Payment confirmed. Your VIP is active.");
      router.refresh();
    }
  }, [confirmed, checkout, paid, router]);

  // Leave nothing behind once the user moves on from a confirmed payment.
  useEffect(
    () => () => {
      if (parseStored(readRaw())?.paid) writeStored(null);
    },
    [],
  );

  const checking = verify.isFetching;
  const gaveUp = (queryClient.getQueryState(["payment", reference])?.dataUpdateCount ?? 0) >= MAX_POLLS;

  if (paid) {
    return (
      <div className="qo-card qo-notice is-ok" role="status">
        <HugeiconsIcon icon={CheckmarkCircle02Icon} size={22} aria-hidden="true" />
        <p>Payment confirmed. You can now generate codes from the Generate page.</p>
      </div>
    );
  }

  const status = verify.isError
    ? `${verify.error.message} We'll keep trying.`
    : manualTried && !checking
      ? "We haven't received it yet. Bank transfers can take a minute. We'll keep checking."
      : gaveUp
        ? "We stopped checking automatically. Tap I've paid to check again."
        : lapsed
          ? "Automatic checking has stopped for this account."
          : "Checking automatically every few seconds.";

  return (
    <div className="qo-upgrade-grid">
      <PlanCard>
        {checkout ? (
          <p className="qo-plan-note">Payment started. Follow the payment details.</p>
        ) : (
          <button
            type="button"
            className="qo-btn-primary qo-plan-cta"
            disabled={start.isPending}
            onClick={() => start.mutate()}
          >
            {start.isPending
              ? "Preparing payment…"
              : active
                ? `Renew for ${VIP_PRICE_LABEL}`
                : `Pay ${VIP_PRICE_LABEL} by bank transfer`}
          </button>
        )}
      </PlanCard>

      {checkout ? (
        <CheckoutPanel
          amount={checkout.amount ?? VIP_PRICE_NGN}
          expectedAmount={VIP_PRICE_NGN}
          account={account}
          reference={checkout.reference ?? ""}
          lapsed={lapsed}
          checking={checking}
          status={status}
          onPaid={async () => {
            setManualTried(true);
            await verify.refetch();
          }}
          onNewPayment={() => {
            writeStored(null);
            start.mutate();
          }}
          newPaymentPending={start.isPending}
        />
      ) : (
        <HowPaying />
      )}
    </div>
  );
}
