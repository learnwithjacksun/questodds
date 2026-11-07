import "server-only";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";

export const ADMIN_COOKIE = "qo_admin";
export const ADMIN_SESSION_SECONDS = 60 * 60 * 24; // 1 day

function key() {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) throw new Error("AUTH_SECRET must be set (min 32 chars)");
  return new TextEncoder().encode(secret);
}

export type AdminClaims = { userId: string; telegramId: string; tokenVersion: number };

/** The admin cookie only proves a fresh email code was entered. Who may use it is re-checked per request. */
export async function createAdminSession(claims: AdminClaims) {
  const token = await new SignJWT({ tg: claims.telegramId, tv: claims.tokenVersion })
    .setProtectedHeader({ alg: "HS256" })
    .setAudience("admin")
    .setSubject(claims.userId)
    .setIssuedAt()
    .setExpirationTime(`${ADMIN_SESSION_SECONDS}s`)
    .sign(key());

  (await cookies()).set(ADMIN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: ADMIN_SESSION_SECONDS,
  });
}

export async function getAdminClaims(): Promise<AdminClaims | null> {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key(), { algorithms: ["HS256"], audience: "admin" });
    if (!payload.sub || typeof payload.tg !== "string") return null;
    return {
      userId: payload.sub,
      telegramId: payload.tg,
      tokenVersion: typeof payload.tv === "number" ? payload.tv : 0,
    };
  } catch {
    return null;
  }
}

export async function destroyAdminSession() {
  (await cookies()).delete(ADMIN_COOKIE);
}
