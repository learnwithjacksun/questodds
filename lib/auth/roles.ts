import "server-only";

export type Role = "user" | "admin" | "owner";

const ranks: Record<Role, number> = { user: 0, admin: 1, owner: 2 };

/** OWNER_TELEGRAM_IDS bootstrap: these Telegram IDs are always owners, whatever the database says. */
export function ownerIds(): Set<string> {
  return new Set(
    (process.env.OWNER_TELEGRAM_IDS ?? "")
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean),
  );
}

export function effectiveRole(doc: { role?: string | null; telegramId?: string | null }): Role {
  if (doc.telegramId && ownerIds().has(doc.telegramId)) return "owner";
  return doc.role === "admin" || doc.role === "owner" ? doc.role : "user";
}

export const isStaff = (role: Role) => role !== "user";
export const hasRole = (role: Role, min: Role) => ranks[role] >= ranks[min];
