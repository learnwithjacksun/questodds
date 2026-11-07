import { NextResponse } from "next/server";
import { isValidObjectId } from "mongoose";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { audit } from "@/lib/admin/audit";
import { actorOf, guardAdmin } from "@/lib/auth/require-admin";
import { effectiveRole } from "@/lib/auth/roles";
import { User } from "@/lib/models/user";

const actionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("reveal_email") }),
  z.object({ action: z.literal("suspend"), reason: z.string().trim().max(200).optional() }),
  z.object({ action: z.literal("unsuspend") }),
  z.object({ action: z.literal("force_logout") }),
  z.object({ action: z.literal("unlink_telegram") }),
  z.object({ action: z.literal("set_note"), note: z.string().max(2000) }),
  z.object({ action: z.literal("set_role"), role: z.enum(["user", "admin"]) }),
  z.object({ action: z.literal("delete"), confirm: z.string() }),
]);

const fail = (error: string, status: number) => NextResponse.json({ error }, { status });

/** One endpoint for everything an admin can do to a single user. Each action is checked and logged. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await guardAdmin();
  if (!guard.ok) return guard.response;
  const { staff } = guard;

  const { id } = await params;
  if (!isValidObjectId(id)) return fail("Unknown user", 404);

  const parsed = actionSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail("Invalid request", 400);
  const input = parsed.data;

  await connectDB();
  const target = await User.findById(id);
  if (!target) return fail("Unknown user", 404);

  const targetRole = effectiveRole(target);
  const actor = actorOf(staff);
  const isSelf = target.id === staff.id;
  const log = (action: string, meta?: Record<string, unknown>) =>
    audit({ actor, action, targetType: "user", targetId: target.id, meta });

  // Staff can look at anyone, but changing staff is reserved for owners, and owners are fixed.
  const mutating = input.action !== "reveal_email" && input.action !== "set_note";
  if (mutating) {
    if (isSelf) return fail("You can't do that to your own account", 403);
    if (targetRole === "owner") return fail("Owners can't be changed from the admin area", 403);
    if (targetRole === "admin" && staff.role !== "owner") return fail("Only an owner can change an admin", 403);
  }

  switch (input.action) {
    case "reveal_email":
      await log("user.email_revealed");
      return NextResponse.json({ email: target.email });

    case "set_note":
      target.adminNote = input.note.trim() || undefined;
      await target.save();
      await log("user.note_saved");
      return NextResponse.json({ ok: true });

    case "suspend":
      target.status = "suspended";
      target.suspendedReason = input.reason || undefined;
      target.tokenVersion = (target.tokenVersion ?? 0) + 1; // ends their sessions now
      await target.save();
      await log("user.suspended", { reason: input.reason });
      return NextResponse.json({ ok: true });

    case "unsuspend":
      target.status = "active";
      target.suspendedReason = undefined;
      await target.save();
      await log("user.unsuspended");
      return NextResponse.json({ ok: true });

    case "force_logout":
      target.tokenVersion = (target.tokenVersion ?? 0) + 1;
      await target.save();
      await log("user.forced_logout");
      return NextResponse.json({ ok: true });

    case "unlink_telegram":
      await User.updateOne(
        { _id: target._id },
        {
          $unset: { telegramId: 1, telegramUsername: 1, telegramPhotoUrl: 1, telegramLinkedAt: 1, vipUntil: 1 },
          $inc: { tokenVersion: 1 },
        },
      );
      await log("user.telegram_unlinked", { telegramId: target.telegramId });
      return NextResponse.json({ ok: true });

    case "set_role":
      if (staff.role !== "owner") return fail("Only an owner can change roles", 403);
      target.role = input.role;
      target.tokenVersion = (target.tokenVersion ?? 0) + 1;
      await target.save();
      await log("user.role_changed", { role: input.role });
      return NextResponse.json({ ok: true });

    case "delete":
      if (staff.role !== "owner") return fail("Only an owner can delete accounts", 403);
      if (input.confirm !== target.username) return fail("Type the username exactly to confirm", 400);
      await User.deleteOne({ _id: target._id });
      await log("user.deleted", { username: target.username, email: target.email });
      return NextResponse.json({ ok: true, deleted: true });
  }
}
