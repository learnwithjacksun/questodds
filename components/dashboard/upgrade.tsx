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
import {
  checkoutSchema,
  type Checkout,
  type PaymentCheck,
  type SubscriptionStatus,
} from "@/lib/sporty/schemas";

const POLL_MS = 4000;
const MAX_POLLS = 150; // 10 minutes at 4 seconds
/** After the 10 minutes, keep checking slowly so a late transfer still unlocks by itself. */
const SLOW_POLL_MS = 30_000;
/** "I've paid" can't be tapped again for a few seconds. */
const TAP_COOLDOWN_MS = 5000;

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
  // Bumping this starts a fresh round of automatic checks ("Check again").
  const [round, setRound] = useState(0);
  const [coolingDown, setCoolingDown] = useState(false);

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

  const paid = !!stored?.paid;

  // Automatic checks read the subscription (read-only, safe to poll). They never call the payment
  // check, so there is no tight verify loop.
  const watch = useQuery({
    queryKey: ["subscription", reference, round],
    queryFn: () => getJson<SubscriptionStatus>("/api/subscription"),
    enabled: !!reference && !paid,
    retry: false,
    refetchOnWindowFocus: true,
    refetchInterval: (q) => (q.state.dataUpdateCount >= MAX_POLLS ? SLOW_POLL_MS : POLL_MS),
  });

  // "I've paid": one payment check per tap. The service credits each reference once, so repeats are harmless.
  const verify = useMutation({
    mutationFn: () => getJson<PaymentCheck>(`/api/payment/${encodeURIComponent(reference ?? "")}`),
    onSettled: () => {
      setCoolingDown(true);
      setTimeout(() => setCoolingDown(false), TAP_COOLDOWN_MS);
    },
  });

  // Confirmed by the subscription becoming active (or extending, for a renewal) or by the payment check.
  const sub = verify.data?.subscription ?? watch.data;
  const activeNow = !!sub && ("unavailable" in sub ? !sub.unavailable : true) && sub.active;
  const renewed = activeNow && (sub?.expiresAt ?? 0) > (baselineExpiresAt ?? 0);
  const confirmed = verify.data?.status === "paid" || renewed;

  useEffect(() => {
    if (confirmed && checkout && !paid) {
      writeStored({ checkout, paid: true });
      // Confirmed through the subscription: ask the payment check once so our payment record is
      // marked paid too (the service credits each reference once, so this can't extend the plan).
      if (verify.data?.status !== "paid" && !verify.isPending) verify.mutate();
      toast.success("Payment confirmed. Your VIP is active.");
      // Header badge, locked screens and generate buttons all read the subscription on the server.
      void queryClient.invalidateQueries({ queryKey: ["subscription"] });
      router.refresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- verify is a fresh object each render; only the inputs above matter
  }, [confirmed, checkout, paid, router, queryClient]);

  // Leave nothing behind once the user moves on from a confirmed payment.
  useEffect(
    () => () => {
      if (parseStored(readRaw())?.paid) writeStored(null);
    },
    [],
  );

  const checking = verify.isPending || coolingDown;
  const polls = queryClient.getQueryState(["subscription", reference, round])?.dataUpdateCount ?? 0;
  const gaveUp = polls >= MAX_POLLS;

  if (paid) {
    const detail = sub?.expDate
      ? ` VIP active until ${sub.expDate} (${sub.daysLeft} day${sub.daysLeft === 1 ? "" : "s"}).`
      : "";
    return (
      <div className="qo-card qo-notice is-ok" role="status">
        <HugeiconsIcon icon={CheckmarkCircle02Icon} size={22} aria-hidden="true" />
        <p>Payment confirmed.{detail} You can now generate codes from the Generate page.</p>
      </div>
    );
  }

  const status = verify.isError
    ? `${verify.error.message} We'll keep checking.`
    : gaveUp
      ? "Payment not confirmed yet. If you already paid, it can take a few minutes. Your access will unlock automatically."
      : manualTried && !checking
        ? "We haven't received it yet. Bank transfers can take a minute. We'll keep checking."
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
          onPaid={() => {
            setManualTried(true);
            verify.mutate();
          }}
          showCheckAgain={gaveUp}
          onCheckAgain={() => setRound((r) => r + 1)}
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
