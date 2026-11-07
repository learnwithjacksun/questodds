import { NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { audit } from "@/lib/admin/audit";
import { createAdminSession } from "@/lib/auth/admin-session";
import { verifyAdminCode } from "@/lib/auth/admin-challenge";
import { actorOf, guardAdmin } from "@/lib/auth/require-admin";
import { User } from "@/lib/models/user";

const bodySchema = z.object({ code: z.string().regex(/^\d{6}$/) });

export async function POST(req: Request) {
  const guard = await guardAdmin({ stage: "code" });
  if (!guard.ok) return guard.response;
  const { staff } = guard;

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter the 6-digit code" }, { status: 400 });

  try {
    await connectDB();
    const result = await verifyAdminCode(staff.id, parsed.data.code);

    if (!result.ok) {
      await audit({
        actor: actorOf(staff),
        action: result.reason === "locked" ? "admin.locked_out" : "admin.wrong_code",
        targetType: "admin",
        targetId: staff.id,
      });
      if (result.reason === "locked") {
        return NextResponse.json(
          { error: "Too many wrong codes. Admin sign-in is locked for 15 minutes." },
          { status: 429 },
        );
      }
      return NextResponse.json(
        {
          error:
            result.attemptsLeft !== undefined
              ? `Wrong code. ${result.attemptsLeft} attempt${result.attemptsLeft === 1 ? "" : "s"} left.`
              : "Invalid or expired code",
        },
        { status: 400 },
      );
    }

    // The cookie is bound to the Telegram ID and token version read just now.
    const doc = await User.findById(staff.id).select("tokenVersion telegramId").lean();
    if (!doc?.telegramId) return NextResponse.json({ error: "Link Telegram first" }, { status: 403 });

    await createAdminSession({
      userId: staff.id,
      telegramId: doc.telegramId,
      tokenVersion: doc.tokenVersion ?? 0,
    });
    await audit({ actor: actorOf(staff), action: "admin.signed_in", targetType: "admin", targetId: staff.id });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[admin] verify failed", err);
    return NextResponse.json({ error: "Something went wrong. Try again." }, { status: 500 });
  }
}
