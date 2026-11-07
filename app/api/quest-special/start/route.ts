import { NextResponse } from "next/server";
import { guardApi, upstreamError } from "@/lib/api-guard";
import { startQuestSpecial } from "@/lib/sporty/client";
import { questStartRequestSchema } from "@/lib/sporty/schemas";

/** Start a Quest Special scan (VIP only; the external API enforces the 20/day quota). */
export async function POST(request: Request) {
  const guard = await guardApi({ vip: true });
  if (!guard.ok) return guard.response;

  // An empty or invalid body falls back to the defaults (any mode, single leg).
  const body = await request.json().catch(() => ({}));
  const options = questStartRequestSchema.safeParse(body);

  try {
    return NextResponse.json(
      await startQuestSpecial(guard.apiUserId,options.success ? options.data : { mode: "any", legs: 1 }),
    );
  } catch (err) {
    return upstreamError(err, "Couldn't start Quest Special. Try again.");
  }
}
