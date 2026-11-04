/** Branded loader shown while a route streams in. Pure CSS, so it works as a Suspense fallback. */
export function PageLoader({ fullscreen = false }: { fullscreen?: boolean }) {
  return (
    <div
      className={`qo-loader${fullscreen ? " is-fullscreen" : ""}`}
      role="status"
      aria-live="polite"
    >
      <span className="qo-loader-logo">Quest Codes</span>
      <span className="qo-loader-bar" aria-hidden="true" />
      <span className="qo-sr">Loading…</span>
    </div>
  );
}
