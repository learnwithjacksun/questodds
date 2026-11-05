"use client";

/** Last-resort boundary: replaces the whole document, so it can't rely on the app's stylesheets. */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          padding: 24,
          fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif",
          background: "#fff",
          color: "#0a0a0a",
          textAlign: "center",
        }}
      >
        <div style={{ maxWidth: 420 }}>
          <h1 style={{ fontSize: 30, letterSpacing: "-0.04em", margin: "0 0 12px" }}>This page couldn&apos;t load</h1>
          <p style={{ color: "#6b6b6b", lineHeight: 1.5, margin: "0 0 24px" }}>
            Something went wrong on our side. Please try again in a moment.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              height: 48,
              padding: "0 28px",
              border: 0,
              borderRadius: 999,
              background: "#0a0a0a",
              color: "#fff",
              fontSize: 15,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
