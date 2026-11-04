import "server-only";
import { NextResponse } from "next/server";
import { getAccess } from "@/lib/access";
import { getCurrentUser, type CurrentUser } from "@/lib/auth/current-user";
import { SportyApiError } from "@/lib/sporty/client";

type Guard =
  | { ok: true; user: CurrentUser; telegramId: string }
  | { ok: false; response: NextResponse };

const fail = (body: Record<string, unknown>, status: number): Guard => ({
  ok: false,
  response: NextResponse.json(body, { status }),
});

/**
 * Shared gate for routes that act on the external API for the signed-in user.
 * Always requires a session and a linked Telegram; `vip: true` also requires an active subscription.
 */
export async function guardApi({ vip }: { vip: boolean }): Promise<Guard> {
  const user = await getCurrentUser();
  if (!user) return fail({ error: "Sign in first" }, 401);

  const access = await getAccess(user);
  if (!access.linked || !user.telegram) {
    return fail({ error: "Link your Telegram account first", reason: "not_linked" }, 403);
  }
  if (vip) {
    if (access.unavailable) {
      return fail({ error: "Couldn't check your subscription. Try again shortly." }, 503);
    }
    if (!access.allowed) {
      return fail({ error: "An active VIP subscription is required", reason: "not_subscribed" }, 403);
    }
  }
  return { ok: true, user, telegramId: user.telegram.id };
}

/** Turn an external-API failure into a response, keeping meaningful 4xx messages (quota, VIP). */
export function upstreamError(err: unknown, fallback: string): NextResponse {
  if (err instanceof SportyApiError) {
    const clientError = err.status !== undefined && err.status >= 400 && err.status < 500;
    return NextResponse.json({ error: err.message }, { status: clientError ? err.status : 502 });
  }
  console.error("[upstream]", err);
  return NextResponse.json({ error: fallback }, { status: 502 });
}
