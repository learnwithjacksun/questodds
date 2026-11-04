import { NextResponse } from "next/server";
import { guardApi, upstreamError } from "@/lib/api-guard";
import { getQuestSpecialStatus } from "@/lib/sporty/client";

/** Polled by the dashboard while a scan is active. Needs a linked account, not a live VIP check. */
export async function GET() {
  const guard = await guardApi({ vip: false });
  if (!guard.ok) return guard.response;

  try {
    return NextResponse.json(await getQuestSpecialStatus(guard.telegramId));
  } catch (err) {
    return upstreamError(err, "Couldn't check Quest Special. Try again.");
  }
}
