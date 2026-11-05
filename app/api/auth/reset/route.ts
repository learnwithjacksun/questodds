import { NextResponse } from "next/server";
import { destroySession } from "@/lib/auth/session";

/** Clears a stale session cookie (valid signature, but no matching user), then sends the visitor to sign in. */
export async function GET(req: Request) {
  await destroySession();
  return NextResponse.redirect(new URL("/login", req.url));
}
