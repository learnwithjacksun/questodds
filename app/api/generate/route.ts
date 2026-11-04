import { NextResponse } from "next/server";
import { guardApi, upstreamError } from "@/lib/api-guard";
import { generateCodes } from "@/lib/sporty/client";
import { generateRequestSchema } from "@/lib/sporty/schemas";

/** Generation can take minutes (scan + several mints with gaps). */
export const maxDuration = 300;

/** One run per user at a time on this instance; the external service rate-limits SportyBet calls. */
const inFlight = new Set<string>();

export async function POST(req: Request) {
  const guard = await guardApi({ vip: true });
  if (!guard.ok) return guard.response;

  const parsed = generateRequestSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Choose a service" }, { status: 400 });

  const { user, telegramId } = guard;
  if (inFlight.has(user.id)) {
    return NextResponse.json({ error: "A generation is already running for you" }, { status: 429 });
  }
  inFlight.add(user.id);
  try {
    return NextResponse.json(await generateCodes(parsed.data.sport, telegramId, parsed.data.fresh));
  } catch (err) {
    return upstreamError(err, "Couldn't generate codes. Try again.");
  } finally {
    inFlight.delete(user.id);
  }
}
