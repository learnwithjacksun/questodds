import "server-only";
import { NextResponse } from "next/server";
import { getAccess } from "@/lib/access";
import { getApiUserId } from "@/lib/api-user";
import { getCurrentUser, type CurrentUser } from "@/lib/auth/current-user";
import { SportyApiError } from "@/lib/sporty/client";

type Guard =
  | {
      ok: true;
      user: CurrentUser;
      /** The id for every call to the code service (the account's _id). */
      apiUserId: string;
      /** Only when Telegram is linked. Never required. */
      telegramId: string | null;
    }
  | { ok: false; response: NextResponse };

const fail = (body: Record<string, unknown>, status: number): Guard => ({
  ok: false,
  response: NextResponse.json(body, { status }),
});

/**
 * Shared gate for routes that act on the external API for the signed-in user.
 * Requires a session; `vip: true` also requires an active subscription. Telegram is optional.
 */
export async function guardApi({ vip }: { vip: boolean }): Promise<Guard> {
  const user = await getCurrentUser();
  if (!user) return fail({ error: "Sign in first" }, 401);

  if (vip) {
    const access = await getAccess(user);
    if (access.unavailable) {
      return fail({ error: "Couldn't check your subscription. Try again shortly." }, 503);
    }
    if (!access.allowed) {
      return fail(
        { success: false, error: "A VIP subscription is required", code: "subscription_required" },
        403,
      );
    }
  }
  return { ok: true, user, apiUserId: getApiUserId(user), telegramId: user.telegram?.id ?? null };
}

/** Turn an external-API failure into a response, keeping meaningful 4xx messages (quota, VIP). */
export function upstreamError(err: unknown, fallback: string): NextResponse {
  if (err instanceof SportyApiError) {
    const clientError = err.status !== undefined && err.status >= 400 && err.status < 500;
    return NextResponse.json(
      {
        error: err.message,
        ...(err.code ? { code: err.code } : {}),
        ...(err.validTiers ? { validTiers: err.validTiers } : {}),
      },
      { status: clientError ? err.status : 502 },
    );
  }
  console.error("[upstream]", err);
  return NextResponse.json({ error: fallback }, { status: 502 });
}
