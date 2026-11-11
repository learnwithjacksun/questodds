"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { STATS_VERIFIED_LEAGUES } from "@/lib/sporty/sports";

/** Bump the suffix to show a new announcement to everyone again. */
const SEEN_KEY = "qo-football-update-v1";
const COLORS = ["#7b61ff", "#00c2ff", "#ff4fd8", "#17c964", "#f5a524", "#ff6b6b"];

function alreadySeen(): boolean {
  try {
    return localStorage.getItem(SEEN_KEY) === "1";
  } catch {
    return false; // storage blocked: show it, once per page load
  }
}
function markSeen() {
  try {
    localStorage.setItem(SEEN_KEY, "1");
  } catch {
    /* ignore */
  }
}

/** A short burst of confetti on a canvas. Cleans up after itself and never blocks clicks. */
function Confetti() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = window.innerWidth;
    let h = window.innerHeight;
    const resize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    // Two bursts from the lower corners, then gravity does the rest.
    const pieces = Array.from({ length: 140 }, (_, i) => {
      const fromLeft = i % 2 === 0;
      const angle = (fromLeft ? -60 : -120) * (Math.PI / 180) + (Math.random() - 0.5) * 0.9;
      const speed = 9 + Math.random() * 9;
      return {
        x: fromLeft ? w * 0.1 : w * 0.9,
        y: h * 0.85,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 6 + Math.random() * 6,
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.4,
        color: COLORS[i % COLORS.length],
      };
    });

    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const elapsed = now - start;
      ctx.clearRect(0, 0, w, h);
      for (const p of pieces) {
        p.vy += 0.28; // gravity
        p.vx *= 0.992;
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;
        ctx.save();
        ctx.globalAlpha = Math.max(0, 1 - elapsed / 3200);
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        ctx.restore();
      }
      if (elapsed < 3200) frame = requestAnimationFrame(tick);
      else ctx.clearRect(0, 0, w, h);
    };
    frame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={ref} className="qo-confetti" aria-hidden="true" />;
}

/** One-time announcement for the football upgrade. Remembered per browser. */
export function FootballUpdatePopup({
  href = "/dashboard/generate?sport=football",
  cta = "Try Football",
}: {
  /** Where the main button goes. The landing page sends visitors to sign up. */
  href?: string;
  cta?: string;
}) {
  const [open, setOpen] = useState(false);
  const primary = useRef<HTMLAnchorElement>(null);

  // A short delay so the page settles first; it also keeps the state change out of the effect body.
  useEffect(() => {
    if (alreadySeen()) return;
    const id = setTimeout(() => setOpen(true), 700);
    return () => clearTimeout(id);
  }, []);

  useEffect(() => {
    if (!open) return;
    primary.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        markSeen();
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (!open) return null;

  const close = () => {
    markSeen();
    setOpen(false);
  };

  return (
    <>
      <Confetti />
      <div className="qo-pop-backdrop" onClick={close}>
        <div
          className="qo-pop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="qo-pop-title"
          onClick={(e) => e.stopPropagation()}
        >
          <span className="qo-pop-tag">New</span>
          <h2 id="qo-pop-title">Football predictions just got better</h2>
          <p>
            Football picks now come with an extra layer of checks. Matches in the{" "}
            {STATS_VERIFIED_LEAGUES.map((l) => l.name).join(", ")} are also reviewed against live team
            stats, and codes show a &ldquo;Stats verified&rdquo; badge when it applies.
          </p>
          <div className="qo-pop-actions">
            <Link
              ref={primary}
              href={href}
              className="qo-btn-primary"
              onClick={close}
            >
              {cta}
            </Link>
            <button type="button" className="qo-btn-ghost" onClick={close}>
              Maybe later
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
