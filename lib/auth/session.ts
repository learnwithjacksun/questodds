import "server-only";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";

import { SESSION_COOKIE, SESSION_MAX_AGE as MAX_AGE } from "@/lib/auth/constants";

export { SESSION_COOKIE };

function key() {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) throw new Error("AUTH_SECRET must be set (min 32 chars)");
  return new TextEncoder().encode(secret);
}

export async function createSession(userId: string, tokenVersion = 0) {
  const token = await new SignJWT({ tv: tokenVersion })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(key());

  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function getSession(): Promise<{ userId: string; tokenVersion: number } | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key(), { algorithms: ["HS256"] });
    // Admin tokens are signed with the same key; they must never work as a user session.
    if (!payload.sub || payload.aud) return null;
    // Sessions issued before versions existed have no `tv` and count as version 0.
    return { userId: payload.sub, tokenVersion: typeof payload.tv === "number" ? payload.tv : 0 };
  } catch {
    return null;
  }
}

export async function destroySession() {
  (await cookies()).delete(SESSION_COOKIE);
}
