"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { HugeiconsIcon } from "@hugeicons/react";
import { Mail01Icon, SecurityLockIcon } from "@hugeicons/core-free-icons";
import { postJson } from "@/lib/http";

function maskEmail(email: string) {
  const [name, domain] = email.split("@");
  return `${name.slice(0, 1)}${"*".repeat(Math.max(2, Math.min(name.length - 1, 6)))}@${domain}`;
}

/** Shown to staff who still need to link Telegram. */
export function GateNeedsTelegram() {
  return (
    <div className="qo-auth-step">
      <span className="qo-icon-badge" aria-hidden="true">
        <HugeiconsIcon icon={SecurityLockIcon} size={22} />
      </span>
      <h1 className="qo-auth-title">Link Telegram first</h1>
      <p className="qo-auth-sub">
        Admin access is tied to a verified Telegram account, so every action is attributable. Link yours
        in Settings, then come back here.
      </p>
      <Link href="/dashboard/settings" className="qo-btn-primary qo-auth-btn">
        Open Settings
      </Link>
    </div>
  );
}

/** Step-up: a fresh emailed code is required every time an admin session starts (it lasts 24 hours). */
export function GateCode({ email, username }: { email: string; username: string }) {
  const router = useRouter();
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const send = useMutation({
    mutationFn: () => postJson("/api/admin/gate/request-code"),
    onSuccess: () => {
      setSent(true);
      setMessage(null);
      setCooldown(60);
    },
    onError: (err: Error & { data?: { seconds?: number } }) => {
      setMessage(err.message);
      if (err.data?.seconds) setCooldown(err.data.seconds);
    },
  });

  const verify = useMutation({
    mutationFn: () => postJson("/api/admin/gate/verify", { code }),
    onSuccess: () => router.refresh(),
    onError: (err: Error) => {
      setMessage(err.message);
      setCode("");
    },
  });

  return (
    <div className="qo-auth-step">
      <span className="qo-icon-badge" aria-hidden="true">
        <HugeiconsIcon icon={sent ? Mail01Icon : SecurityLockIcon} size={22} />
      </span>
      <h1 className="qo-auth-title">Admin sign-in</h1>
      <p className="qo-auth-sub">
        Signed in as <strong>{username}</strong>.{" "}
        {sent ? (
          <>
            Enter the 6-digit code we emailed to <strong>{maskEmail(email)}</strong>.
          </>
        ) : (
          <>We&apos;ll email a one-time code to {maskEmail(email)}. It opens the admin area for 24 hours.</>
        )}
      </p>

      {sent ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (code.length === 6) verify.mutate();
          }}
        >
          <label className="qo-label" htmlFor="admin-code">
            Admin code
          </label>
          <input
            id="admin-code"
            className={`qo-input qo-admin-code${message ? " is-invalid" : ""}`}
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]*"
            maxLength={6}
            autoFocus
            value={code}
            disabled={verify.isPending}
            onChange={(e) => {
              setMessage(null);
              setCode(e.target.value.replace(/\D/g, "").slice(0, 6));
            }}
          />
          {message && (
            <p className="qo-field-error" role="alert">
              {message}
            </p>
          )}
          <button type="submit" className="qo-btn-primary qo-auth-btn" disabled={code.length !== 6 || verify.isPending}>
            {verify.isPending ? "Checking…" : "Open admin"}
          </button>
          <button
            type="button"
            className="qo-link-btn"
            disabled={cooldown > 0 || send.isPending}
            onClick={() => send.mutate()}
          >
            {cooldown > 0 ? `Resend code in ${cooldown}s` : "Send a new code"}
          </button>
        </form>
      ) : (
        <>
          {message && (
            <p className="qo-field-error" role="alert">
              {message}
            </p>
          )}
          <button
            type="button"
            className="qo-btn-primary qo-auth-btn"
            disabled={send.isPending || cooldown > 0}
            onClick={() => send.mutate()}
          >
            {send.isPending ? "Sending…" : cooldown > 0 ? `Wait ${cooldown}s` : "Email me a code"}
          </button>
        </>
      )}
    </div>
  );
}
