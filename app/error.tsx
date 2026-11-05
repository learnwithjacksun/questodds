"use client";

import { useEffect } from "react";
import Link from "next/link";

/** Shown when a page throws while rendering (database or service hiccup), instead of a blank failure. */
export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app] render error", error.digest ?? "", error.message);
  }, [error]);

  return (
    <main className="qo-error">
      <h1>
        This page <span className="qo-serif">couldn&apos;t load</span>
      </h1>
      <p>
        Something went wrong on our side. Try again in a moment. If it keeps happening, message support
        with the button at the bottom right.
      </p>
      <div className="qo-error-actions">
        <button type="button" className="qo-btn-primary" onClick={reset}>
          Try again
        </button>
        <Link href="/" className="qo-btn-ghost">
          Go to home
        </Link>
      </div>
      {error.digest && <span className="qo-error-ref">Reference: {error.digest}</span>}
    </main>
  );
}
