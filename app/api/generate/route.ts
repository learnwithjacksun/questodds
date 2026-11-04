import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getAccess } from "@/lib/access";
import { generateCodes, SportyApiError } from "@/lib/sporty/client";
import { generateRequestSchema } from "@/lib/sporty/schemas";

/** Generation can take minutes (scan + several mints with gaps). */
export const maxDuration = 300;

/** One run per user at a time on this instance; the external service rate-limits SportyBet calls. */
const inFlight = new Set<string>();

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in first" }, { status: 401 });

  const parsed = generateRequestSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Choose a service" }, { status: 400 });

  const access = await getAccess(user);
  if (!access.linked) {
    return NextResponse.json(
      { error: "Link your Telegram account first", reason: "not_linked" },
      { status: 403 },
    );
  }
  if (access.unavailable) {
    return NextResponse.json(
      { error: "Couldn't check your subscription. Try again shortly." },
      { status: 503 },
    );
  }
  if (!access.allowed) {
    return NextResponse.json(
      { error: "An active VIP subscription is required", reason: "not_subscribed" },
      { status: 403 },
    );
  }

  if (inFlight.has(user.id)) {
    return NextResponse.json({ error: "A generation is already running for you" }, { status: 429 });
  }
  inFlight.add(user.id);
  try {
    // user.telegram is non-null here: access.linked implies it.
    const result = await generateCodes(parsed.data.sport, user.telegram!.id, parsed.data.fresh);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof SportyApiError ? err.message : "Couldn't generate codes. Try again.";
    if (!(err instanceof SportyApiError)) console.error("[generate] failed", err);
    return NextResponse.json({ error: message }, { status: 502 });
  } finally {
    inFlight.delete(user.id);
  }
}
