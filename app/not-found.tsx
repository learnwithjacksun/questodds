import Link from "next/link";

export default function NotFound() {
  return (
    <main className="qo-error">
      <h1>
        Page <span className="qo-serif">not found</span>
      </h1>
      <p>The page you&apos;re looking for doesn&apos;t exist or has moved.</p>
      <div className="qo-error-actions">
        <Link href="/" className="qo-btn-primary">
          Go to home
        </Link>
        <Link href="/dashboard" className="qo-btn-ghost">
          Open dashboard
        </Link>
      </div>
    </main>
  );
}
