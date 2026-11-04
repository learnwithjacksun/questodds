import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { connectDB } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { User } from "@/lib/models/user";

export type CurrentUser = {
  id: string;
  username: string;
  email: string;
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

  return {
    id: String(doc._id),
    username: doc.username,
    email: doc.email,
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

/** For pages: redirect to /login when signed out. */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}
