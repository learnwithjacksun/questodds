import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { connectDB } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { User } from "@/lib/models/user";
import { effectiveRole, type Role } from "@/lib/auth/roles";

export type CurrentUser = {
  id: string;
  username: string;
  email: string;
  /** Only used to show the Admin link. The admin area itself re-checks everything. */
  role: Role;
  ageConfirmedAt: Date;
  telegram: { id: string; username: string | null; photoUrl: string | null; linkedAt: Date | null } | null;
};

/** The signed-in user (one DB read per request), or null. */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await getSession();
  if (!session) return null;

  await connectDB();
  const doc = await User.findById(session.userId).lean();
  if (!doc) return null;
  // Signed out everywhere (version bumped) or suspended: the session no longer counts.
  if ((doc.tokenVersion ?? 0) !== session.tokenVersion || doc.status === "suspended") return null;

  return {
    id: String(doc._id),
    username: doc.username,
    email: doc.email,
    role: effectiveRole(doc),
    ageConfirmedAt: doc.ageConfirmedAt,
    telegram: doc.telegramId
      ? {
          id: doc.telegramId,
          username: doc.telegramUsername ?? null,
          photoUrl: doc.telegramPhotoUrl ?? null,
          linkedAt: doc.telegramLinkedAt ?? null,
        }
      : null,
  };
});

/**
 * For pages: redirect to /login when signed out.
 * A session cookie whose user no longer exists (database reset, deleted account) must be cleared
 * first. Going straight to /login would bounce back to /dashboard through proxy.ts, which only
 * checks the cookie's signature, and loop forever (ERR_TOO_MANY_REDIRECTS).
 */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (user) return user;
  redirect((await getSession()) ? "/api/auth/reset" : "/login");
}
