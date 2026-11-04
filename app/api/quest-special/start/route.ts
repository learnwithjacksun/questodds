import { NextResponse } from "next/server";
import { guardApi, upstreamError } from "@/lib/api-guard";
import { startQuestSpecial } from "@/lib/sporty/client";

/** Start a Quest Special scan (VIP only; the external API enforces the 20/day quota). */
export async function POST() {
  const guard = await guardApi({ vip: true });
  if (!guard.ok) return guard.response;

  try {
    return NextResponse.json(await startQuestSpecial(guard.telegramId));
  } catch (err) {
    return upstreamError(err, "Couldn't start Quest Special. Try again.");
  }
}
