import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { getAdminClaims } from "@/lib/auth/admin-session";
import { effectiveRole, hasRole, isStaff, type Role } from "@/lib/auth/roles";
import { User } from "@/lib/models/user";
import type { AuditActor } from "@/lib/admin/audit";

export type Staff = {
  id: string;
  username: string;
  email: string;
  role: Role;
  telegramId: string | null;
};

export type Gate =
  | { state: "signed_out" }
  | { state: "forbidden" }
  | { state: "needs_telegram"; staff: Staff }
  | { state: "needs_code"; staff: Staff }
  | { state: "ok"; staff: Staff };

/**
 * Where the admin area decides who gets in. Runs on every request and reads the user fresh from the
 * database, so demoting or suspending someone, or bumping their token version, takes effect on their
 * next click even while their admin cookie is still unexpired.
 */
export const resolveGate = cache(async (): Promise<Gate> => {
  const session = await getSession();
  if (!session) return { state: "signed_out" };

  await connectDB();
  const doc = await User.findById(session.userId)
    .select("username email role status telegramId tokenVersion")
    .lean();
  if (!doc) return { state: "signed_out" };
  if ((doc.tokenVersion ?? 0) !== session.tokenVersion || doc.status === "suspended") {
    return { state: "signed_out" };
  }

  const role = effectiveRole(doc);
  if (!isStaff(role)) return { state: "forbidden" };

  const staff: Staff = {
    id: String(doc._id),
    username: doc.username,
    email: doc.email,
    role,
    telegramId: doc.telegramId ?? null,
  };
  if (!staff.telegramId) return { state: "needs_telegram", staff };

  const claims = await getAdminClaims();
  const fresh =
    claims &&
    claims.userId === staff.id &&
    claims.telegramId === staff.telegramId &&
    claims.tokenVersion === (doc.tokenVersion ?? 0);
  return fresh ? { state: "ok", staff } : { state: "needs_code", staff };
});

export const actorOf = (staff: Staff): AuditActor => ({
  id: staff.id,
  name: staff.username,
  telegramId: staff.telegramId,
});

/** For admin pages. Anything short of a fully verified admin never sees data. */
export async function requireAdmin(min: Role = "admin"): Promise<Staff> {
  const gate = await resolveGate();
  if (gate.state === "signed_out") redirect("/login");
  if (gate.state !== "ok") notFound();
  if (!hasRole(gate.staff.role, min)) notFound();
  return gate.staff;
}

type ApiGuard = { ok: true; staff: Staff } | { ok: false; response: NextResponse };

const deny = (status: number, error: string): ApiGuard => ({
  ok: false,
  response: NextResponse.json({ error }, { status, headers: { "Cache-Control": "no-store" } }),
});

/** Browsers send Origin on cross-site writes; refuse any that doesn't match this host. */
async function sameOrigin(): Promise<boolean> {
  const h = await headers();
  const origin = h.get("origin");
  if (!origin) return true;
  const host = h.get("x-forwarded-host") ?? h.get("host");
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

/**
 * For /api/admin routes. `stage: "code"` is only for the sign-in code endpoints, where the admin
 * cookie doesn't exist yet. Every other route needs the full gate. Denials say nothing useful.
 */
export async function guardAdmin(
  opts: { min?: Role; stage?: "full" | "code"; write?: boolean } = {},
): Promise<ApiGuard> {
  if (opts.write !== false && !(await sameOrigin())) return deny(403, "Not allowed");

  const gate = await resolveGate();
  if (gate.state === "signed_out") return deny(401, "Sign in first");
  if (gate.state === "forbidden") return deny(404, "Not found");
  if (gate.state === "needs_telegram") return deny(403, "Link Telegram first");
  if (gate.state === "needs_code") {
    return opts.stage === "code" ? { ok: true, staff: gate.staff } : deny(401, "Admin sign-in required");
  }
  if (!hasRole(gate.staff.role, opts.min ?? "admin")) return deny(403, "Not allowed");
  return { ok: true, staff: gate.staff };
}
