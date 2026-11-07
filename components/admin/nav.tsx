"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Activity01Icon,
  ArrowUp01Icon,
  Cancel01Icon,
  CreditCardIcon,
  FileSearchIcon,
  Home01Icon,
  Logout01Icon,
  UserGroupIcon,
} from "@hugeicons/core-free-icons";
import { LogoMark } from "@/components/brand/logo-mark";

const LINKS = [
  { href: "/admin", label: "Overview", icon: Home01Icon, exact: true },
  { href: "/admin/users", label: "Users", icon: UserGroupIcon },
  { href: "/admin/payments", label: "Payments", icon: CreditCardIcon },
  { href: "/admin/activity", label: "Activity", icon: Activity01Icon },
  { href: "/admin/audit", label: "Audit", icon: FileSearchIcon },
];

export function AdminNav({ username, role }: { username: string; role: string }) {
  const pathname = usePathname();
  const router = useRouter();
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

  const isActive = (l: (typeof LINKS)[number]) =>
    l.exact ? pathname === l.href : pathname.startsWith(l.href);

  const leave = async () => {
    await fetch("/api/admin/gate/logout", { method: "POST" });
    setOpen(false);
    router.replace("/dashboard");
    router.refresh();
  };

  return (
    <>
      <header className={`qo-dnav${scrolled && !open ? " is-scrolled" : ""}`}>
        <Link href="/admin" className="qo-logo" aria-label="Admin overview">
          <LogoMark />
          <span className="qo-logo-word">Quest Codes</span>
          <span className="qo-admin-tag">Admin</span>
        </Link>

        <nav className="qo-dnav-links" aria-label="Admin">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className={isActive(l) ? "is-active" : undefined}>
              <HugeiconsIcon icon={l.icon} size={16} aria-hidden="true" />
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="qo-dnav-user">
          <span className="qo-dnav-name" title={`${username} (${role})`}>
            {username}
          </span>
          <button type="button" className="qo-icon-btn" onClick={leave}>
            <HugeiconsIcon icon={Logout01Icon} size={18} aria-hidden="true" />
            <span className="qo-sr">Leave admin</span>
          </button>
        </div>

        <button
          type="button"
          className="qo-menu-btn qo-dnav-menu"
          aria-expanded={open}
          aria-controls="qo-admin-drawer"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? "Close" : "Menu"}
          <HugeiconsIcon icon={open ? Cancel01Icon : ArrowUp01Icon} size={16} aria-hidden="true" />
        </button>
      </header>

      <div id="qo-admin-drawer" className={`qo-drawer${open ? " is-open" : ""}`} aria-hidden={!open}>
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
          <button type="button" className="qo-drawer-signout" onClick={leave} tabIndex={open ? 0 : -1}>
            Leave admin ({username})
          </button>
        </nav>
      </div>
    </>
  );
}
