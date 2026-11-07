import "server-only";
import { headers } from "next/headers";
import { connectDB } from "@/lib/db";
import { AuditLog } from "@/lib/models/audit-log";

export type AuditActor = { id: string; name?: string; telegramId?: string | null };

type Entry = {
  actor?: AuditActor | null;
  action: string;
  targetType?: "user" | "payment" | "setting" | "admin";
  targetId?: string;
  meta?: Record<string, unknown>;
};

/** Record an admin action. Never throws: a logging failure must not block or hide the action itself. */
export async function audit(entry: Entry) {
  try {
    const h = await headers();
    await connectDB();
    await AuditLog.create({
      actorId: entry.actor?.id,
      actorName: entry.actor?.name,
      actorTelegramId: entry.actor?.telegramId ?? undefined,
      action: entry.action,
      targetType: entry.targetType,
      targetId: entry.targetId,
      meta: entry.meta,
      ip: h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || undefined,
      userAgent: h.get("user-agent")?.slice(0, 200) || undefined,
    });
  } catch (err) {
    console.error("[audit] failed to write", entry.action, err);
  }
}
