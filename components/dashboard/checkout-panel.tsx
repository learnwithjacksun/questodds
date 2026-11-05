import { HugeiconsIcon } from "@hugeicons/react";
import { Alert02Icon, Loading03Icon } from "@hugeicons/core-free-icons";
import { CopyButton } from "@/components/dashboard/copy-button";
import { formatNaira } from "@/lib/plan";
import { formatWhen } from "@/lib/format";
import { SUPPORT_CONTACTS, paymentIssueMessage, whatsappLink } from "@/lib/support";
import type { Checkout } from "@/lib/sporty/schemas";

export type CheckoutPanelProps = {
  /** Amount the payment provider asked for (authoritative for what to transfer). */
  amount: number;
  /** Amount we advertise; a difference triggers a warning. */
  expectedAmount: number;
  account?: Checkout["virtualAccount"];
  reference: string;
  /** The one-time account has expired. */
  lapsed: boolean;
  /** A check is running right now. */
  checking: boolean;
  /** Live status line under the buttons. */
  status: string;
  onPaid: () => void;
  onNewPayment: () => void;
  newPaymentPending: boolean;
};

/** The one-time transfer details with copy buttons. Presentational: all logic lives in Upgrade. */
export function CheckoutPanel(p: CheckoutPanelProps) {
  const mismatch = p.amount !== p.expectedAmount;

  return (
    <section className="qo-card qo-checkout" aria-label="Payment details">
      <div className="qo-checkout-head">
        <h3>Payment details</h3>
        <span className={`qo-pill${p.lapsed ? " is-warn" : ""}`}>
          {p.lapsed ? "Expired" : "Waiting for transfer"}
        </span>
      </div>

      <p className="qo-checkout-lead">
        Send exactly <strong>{formatNaira(p.amount)}</strong> to the account below. This page updates by
        itself. If nothing changes about 5 seconds after you&apos;ve paid, tap <strong>I&apos;ve paid</strong>.
      </p>

      {mismatch && (
        <div className="qo-notice-inline" role="alert">
          <HugeiconsIcon icon={Alert02Icon} size={18} aria-hidden="true" />
          <p>
            The payment provider quoted <strong>{formatNaira(p.amount)}</strong>, not{" "}
            {formatNaira(p.expectedAmount)}. Pay exactly the amount shown here.
          </p>
        </div>
      )}

      <div className="qo-rows">
        <div className="qo-kv">
          <span>Amount</span>
          <strong>{formatNaira(p.amount)}</strong>
          <CopyButton value={String(p.amount)} />
        </div>
        {p.account ? (
          <>
            <div className="qo-kv">
              <span>Account number</span>
              <strong className="qo-mono qo-acct">{p.account.accountNumber}</strong>
              <CopyButton value={p.account.accountNumber} />
            </div>
            <div className="qo-kv">
              <span>Bank</span>
              <strong>{p.account.bankName}</strong>
            </div>
            <div className="qo-kv">
              <span>Account name</span>
              <strong>{p.account.accountName}</strong>
            </div>
          </>
        ) : (
          <p className="qo-checkout-help">
            No transfer account came back for this payment. Start a new payment below.
          </p>
        )}
        <div className="qo-kv">
          <span>Reference</span>
          <strong className="qo-mono qo-ref">{p.reference}</strong>
          <CopyButton value={p.reference} />
        </div>
      </div>

      {p.account?.expiresAt && !p.lapsed && (
        <p className="qo-fine">This account is for this payment only and expires {formatWhen(p.account.expiresAt)}.</p>
      )}

      {p.lapsed && (
        <div className="qo-notice-inline" role="alert">
          <HugeiconsIcon icon={Alert02Icon} size={18} aria-hidden="true" />
          <p>
            This account number has expired. If you already sent the money, tap <strong>I&apos;ve paid</strong>.
            Otherwise start a new payment.
          </p>
        </div>
      )}

      <div className="qo-checkout-actions">
        <button type="button" className="qo-btn-primary qo-btn-sm" disabled={p.checking} onClick={p.onPaid}>
          {p.checking ? (
            <>
              <HugeiconsIcon icon={Loading03Icon} size={16} className="qo-spin" aria-hidden="true" />
              Checking…
            </>
          ) : (
            "I've paid"
          )}
        </button>
        {(p.lapsed || !p.account) && (
          <button type="button" className="qo-btn-ghost" disabled={p.newPaymentPending} onClick={p.onNewPayment}>
            {p.newPaymentPending ? "Preparing…" : "Start a new payment"}
          </button>
        )}
      </div>

      <p className="qo-fine" role="status" aria-live="polite">
        {p.status}
      </p>

      <div className="qo-help">
        <span>Paid but not confirmed after a few minutes?</span>
        <div className="qo-help-links">
          {SUPPORT_CONTACTS.map((c) => (
            <a
              key={c.number}
              href={whatsappLink(c.number, paymentIssueMessage(p.reference))}
              target="_blank"
              rel="noopener noreferrer"
            >
              WhatsApp {c.name}
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
