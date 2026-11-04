import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { SESSION_COOKIE } from "@/lib/auth/constants";

/**
 * Signed-in visitors don't need to request a code again: send them from /login or /register
 * straight to the dashboard. (The dashboard itself still re-checks the session.)
 */
export async function proxy(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const secret = process.env.AUTH_SECRET;
  if (!token || !secret || secret.length < 32) return NextResponse.next();

  try {
    await jwtVerify(token, new TextEncoder().encode(secret), { algorithms: ["HS256"] });
  } catch {
    return NextResponse.next(); // expired or invalid: let them sign in
  }

  const url = req.nextUrl.clone();
  // A Telegram result for a signed-in user belongs on Settings, where the toast will show.
  const tg = url.searchParams.get("tg");
  url.pathname = tg ? "/dashboard/settings" : "/dashboard";
  url.search = tg ? `?tg=${encodeURIComponent(tg)}` : "";
  return NextResponse.redirect(url);
}

export const config = { matcher: ["/login", "/register"] };
