import { after, NextResponse } from "next/server";
import { logGeneration } from "@/lib/admin/generation-log";
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

  const { user, apiUserId } = guard;
  if (inFlight.has(user.id)) {
    return NextResponse.json({ error: "A generation is already running for you" }, { status: 429 });
  }
  inFlight.add(user.id);
  const started = Date.now();
  try {
    const result = await generateCodes(parsed.data.sport, apiUserId, parsed.data.fresh);
    const codes = "codes" in result && Array.isArray(result.codes) ? result.codes.length : 0;
    after(() => logGeneration({ userId: user.id, service: parsed.data.sport, ok: true, codes, started }));
    return NextResponse.json(result);
  } catch (err) {
    after(() =>
      logGeneration({
        userId: user.id,
        service: parsed.data.sport,
        ok: false,
        started,
        error: err instanceof Error ? err.message.slice(0, 160) : "failed",
      }),
    );
    return upstreamError(err, "Couldn't generate codes. Try again.");
  } finally {
    inFlight.delete(user.id);
  }
}
