import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { audit } from "@/lib/admin/audit";
import { issueAdminCode } from "@/lib/auth/admin-challenge";
import { actorOf, guardAdmin } from "@/lib/auth/require-admin";

/** Email a fresh admin code to the signed-in staff member's own address. */
export async function POST() {
  const guard = await guardAdmin({ stage: "code" });
  if (!guard.ok) return guard.response;
  const { staff } = guard;

  try {
    await connectDB();
    const result = await issueAdminCode(staff.id, staff.email);
    if (!result.ok) {
      const error =
        result.reason === "locked"
          ? `Too many wrong codes. Try again in ${Math.ceil(result.seconds / 60)} minutes.`
          : `Wait ${result.seconds}s before asking for another code.`;
      return NextResponse.json({ error, seconds: result.seconds }, { status: 429 });
    }
    await audit({ actor: actorOf(staff), action: "admin.code_sent", targetType: "admin", targetId: staff.id });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[admin] couldn't send code", err);
    return NextResponse.json({ error: "Couldn't send the code. Try again." }, { status: 500 });
  }
}
