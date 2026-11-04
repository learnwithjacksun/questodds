"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

const CALLBACK = "/api/auth/telegram/callback";

function decodeTgAuthResult(raw: string): Record<string, string> | null {
  try {
    let base64 = raw.replace(/-/g, "+").replace(/_/g, "/");
    switch (base64.length % 4) {
      case 2:
        base64 += "==";
        break;
      case 3:
        base64 += "=";
        break;
    }
    const parsed: unknown = JSON.parse(atob(base64));
    if (!parsed || typeof parsed !== "object") return null;
    const out: Record<string, string> = {};
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (value == null) continue;
      out[key] = String(value);
    }
    return out.hash ? out : null;
  } catch {
    return null;
  }
}

function homeForIntent(intent: string | null): string {
  return intent === "link" ? "/dashboard/settings" : "/login";
}

/** Telegram puts the Login Widget result in the URL hash; rewrite it to query params for the API. */
function TelegramReturnClient() {
  const params = useSearchParams();
  const intent = params.get("intent");

  useEffect(() => {
    const home = homeForIntent(intent);
    const hash = window.location.hash.startsWith("#")
      ? window.location.hash.slice(1)
      : window.location.hash;
    const [key, ...rest] = hash.split("=");
    const raw = rest.join("=");

    if (key !== "tgAuthResult" || !raw) {
      window.location.replace(`${home}?tg=denied`);
      return;
    }

    const data = decodeTgAuthResult(raw);
    if (!data) {
      window.location.replace(`${home}?tg=failed`);
      return;
    }

    const next = new URL(CALLBACK, window.location.origin);
    for (const [k, v] of Object.entries(data)) next.searchParams.set(k, v);
    window.location.replace(next.toString());
  }, [intent]);

  return (
    <main className="qo-auth-shell" style={{ minHeight: "40vh", display: "grid", placeItems: "center" }}>
      <p className="qo-hint">Finishing Telegram sign-in…</p>
    </main>
  );
}

export default function TelegramReturnPage() {
  return (
    <Suspense
      fallback={
        <main className="qo-auth-shell" style={{ minHeight: "40vh", display: "grid", placeItems: "center" }}>
          <p className="qo-hint">Finishing Telegram sign-in…</p>
        </main>
      }
    >
      <TelegramReturnClient />
    </Suspense>
  );
}
