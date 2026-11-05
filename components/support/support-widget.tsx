"use client";

import { useEffect, useId, useRef, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowUpRight01Icon, Cancel01Icon, WhatsappIcon } from "@hugeicons/core-free-icons";
import { SUPPORT_CONTACTS, whatsappLink } from "@/lib/support";

/** Floating support button (bottom-right) that expands to the WhatsApp contacts. */
export function SupportWidget({ defaultOpen = false }: { defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const rootRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      toggleRef.current?.focus();
    };
    const onPointer = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onPointer);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onPointer);
    };
  }, [open]);

  return (
    <div className="qo-support" ref={rootRef}>
      <section
        id={panelId}
        className={`qo-support-panel${open ? " is-open" : ""}`}
        aria-label="Contact support"
        aria-hidden={!open}
      >
        <header className="qo-support-head">
          <div>
            <h2>Support</h2>
            <p>Chat with us on WhatsApp.</p>
          </div>
          <button
            type="button"
            className="qo-support-close"
            aria-label="Close support"
            tabIndex={open ? 0 : -1}
            onClick={() => {
              setOpen(false);
              toggleRef.current?.focus();
            }}
          >
            <HugeiconsIcon icon={Cancel01Icon} size={18} aria-hidden="true" />
          </button>
        </header>

        <ul className="qo-support-list">
          {SUPPORT_CONTACTS.map((c) => (
            <li key={c.number}>
              <a
                href={whatsappLink(c.number)}
                target="_blank"
                rel="noopener noreferrer"
                className="qo-support-contact"
                tabIndex={open ? 0 : -1}
              >
                <span className="qo-support-avatar" aria-hidden="true">
                  {c.name.charAt(0)}
                </span>
                <span className="qo-support-who">
                  <strong>{c.name}</strong>
                  <span>Message on WhatsApp</span>
                </span>
                <HugeiconsIcon
                  icon={ArrowUpRight01Icon}
                  size={18}
                  className="qo-support-go"
                  aria-hidden="true"
                />
              </a>
            </li>
          ))}
        </ul>

        <p className="qo-support-note">
          Quest Codes support only. We can&apos;t help with SportyBet accounts or bets.
        </p>
      </section>

      <button
        ref={toggleRef}
        type="button"
        className="qo-support-toggle"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={open ? "Close support" : "Open support"}
        onClick={() => setOpen((v) => !v)}
      >
        <HugeiconsIcon icon={open ? Cancel01Icon : WhatsappIcon} size={24} aria-hidden="true" />
      </button>
    </div>
  );
}
