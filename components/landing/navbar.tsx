"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowUp01Icon, Cancel01Icon } from "@hugeicons/core-free-icons";

const LINKS = [
  { href: "#services", label: "Services" },
  { href: "#how-it-works", label: "How it works" },
  { href: "#telegram", label: "Telegram" },
  { href: "#faq", label: "FAQs" },
  { href: "/login", label: "Log in" },
];

export function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      <header className={`qo-nav${scrolled && !open ? " is-scrolled" : ""}`}>
        <Link href="/" className="qo-logo" aria-label="Quest Codes home">
          Quest Codes
        </Link>
        <button
          type="button"
          className="qo-menu-btn"
          aria-expanded={open}
          aria-controls="qo-drawer"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? "Close" : "Menu"}
          <HugeiconsIcon icon={open ? Cancel01Icon : ArrowUp01Icon} size={16} aria-hidden="true" />
        </button>
      </header>

      <div id="qo-drawer" className={`qo-drawer${open ? " is-open" : ""}`} aria-hidden={!open}>
        <nav className="qo-drawer-links">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} onClick={() => setOpen(false)} tabIndex={open ? 0 : -1}>
              {l.label}
            </Link>
          ))}
        </nav>
        <p className="qo-drawer-foot">
          © 2026 Quest Codes. Not affiliated with SportyBet.
        </p>
      </div>
    </>
  );
}
