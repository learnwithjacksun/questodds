import { NextResponse } from "next/server";
import { guardApi, upstreamError } from "@/lib/api-guard";
import { stopQuestSpecial } from "@/lib/sporty/client";

export async function POST() {
  const guard = await guardApi({ vip: false });
  if (!guard.ok) return guard.response;

  try {
    return NextResponse.json(await stopQuestSpecial(guard.telegramId));
  } catch (err) {
    return upstreamError(err, "Couldn't stop Quest Special. Try again.");
  }
}
