import { NextResponse } from "next/server";
import { audit } from "@/lib/admin/audit";
import { destroyAdminSession } from "@/lib/auth/admin-session";
import { actorOf, guardAdmin } from "@/lib/auth/require-admin";

/** Leave the admin area (the normal user session stays signed in). */
export async function POST() {
  const guard = await guardAdmin({ stage: "code" });
  if (!guard.ok) return guard.response;

  await destroyAdminSession();
  await audit({ actor: actorOf(guard.staff), action: "admin.signed_out", targetType: "admin", targetId: guard.staff.id });
  return NextResponse.json({ ok: true });
}
