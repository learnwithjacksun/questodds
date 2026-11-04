"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowUp01Icon,
  Cancel01Icon,
  Crown02Icon,
  FlashIcon,
  HistoryIcon,
  Home01Icon,
  Logout01Icon,
  Settings01Icon,
} from "@hugeicons/core-free-icons";
import { LogoutButton } from "@/components/auth/logout-button";

const LINKS = [
  { href: "/dashboard", label: "Overview", icon: Home01Icon, exact: true },
  { href: "/dashboard/generate", label: "Generate", icon: FlashIcon },
  { href: "/dashboard/history", label: "History", icon: HistoryIcon },
  { href: "/dashboard/upgrade", label: "Upgrade", icon: Crown02Icon },
  { href: "/dashboard/settings", label: "Settings", icon: Settings01Icon },
];

export function DashNav({ username }: { username: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const isActive = (l: (typeof LINKS)[number]) =>
    l.exact ? pathname === l.href : pathname.startsWith(l.href);

  return (
    <>
      <header className="qo-dnav">
        <Link href="/dashboard" className="qo-logo" aria-label="Quest Codes dashboard">
          Quest Codes
        </Link>

        <nav className="qo-dnav-links" aria-label="Dashboard">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className={isActive(l) ? "is-active" : undefined}>
              <HugeiconsIcon icon={l.icon} size={16} aria-hidden="true" />
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="qo-dnav-user">
          <span className="qo-dnav-name" title={username}>
            {username}
          </span>
          <LogoutButton className="qo-icon-btn">
            <HugeiconsIcon icon={Logout01Icon} size={18} aria-hidden="true" />
            <span className="qo-sr">Sign out</span>
          </LogoutButton>
        </div>

        <button
          type="button"
          className="qo-menu-btn qo-dnav-menu"
          aria-expanded={open}
          aria-controls="qo-dash-drawer"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? "Close" : "Menu"}
          <HugeiconsIcon icon={open ? Cancel01Icon : ArrowUp01Icon} size={16} aria-hidden="true" />
        </button>
      </header>

      <div id="qo-dash-drawer" className={`qo-drawer${open ? " is-open" : ""}`} aria-hidden={!open}>
        <nav className="qo-drawer-links">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              tabIndex={open ? 0 : -1}
              className={isActive(l) ? "is-active" : undefined}
            >
              {l.label}
            </Link>
          ))}
          <LogoutButton className="qo-drawer-signout" onDone={() => setOpen(false)}>
            Sign out ({username})
          </LogoutButton>
        </nav>
        <p className="qo-drawer-foot">Not affiliated with SportyBet.</p>
      </div>
    </>
  );
}

/** Shown while the signed-in user is being resolved. */
export function DashNavSkeleton() {
  return (
    <header className="qo-dnav">
      <span className="qo-logo">Quest Codes</span>
    </header>
  );
}
