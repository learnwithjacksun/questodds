import { NextResponse } from "next/server";
import { getAccess } from "@/lib/access";
import { getCurrentUser } from "@/lib/auth/current-user";

/**
 * The signed-in user's live subscription. Read-only, so the upgrade page polls this instead of the
 * payment check.
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in first" }, { status: 401 });

  const access = await getAccess(user);
  return NextResponse.json(
    {
      active: access.allowed,
      isAdmin: access.isAdmin,
      daysLeft: access.daysLeft,
      expDate: access.expDate,
      expiresAt: access.expiresAt,
      unavailable: access.unavailable,
    },
    { headers: { "cache-control": "no-store" } },
  );
}
