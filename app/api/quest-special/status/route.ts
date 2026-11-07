import { after, NextResponse } from "next/server";
import { guardApi, upstreamError } from "@/lib/api-guard";
import { logQuestSpecialResult } from "@/lib/admin/generation-log";
import { getQuestSpecialStatus } from "@/lib/sporty/client";
import { isQuestSignal } from "@/lib/sporty/schemas";

/** Polled by the dashboard while a scan is active. Needs a linked account, not a live VIP check. */
export async function GET() {
  const guard = await guardApi({ vip: false });
  if (!guard.ok) return guard.response;

  try {
    const status = await getQuestSpecialStatus(guard.telegramId);
    const last = status.lastResult;
    if (!status.active && last) {
      // Record how the scan ended once (the log is keyed by the result's own timestamp).
      const found = isQuestSignal(last);
      const codes = isQuestSignal(last) && last.code ? 1 : 0;
      after(() => logQuestSpecialResult({ userId: guard.user.id, resultAt: last.timestamp, found, codes }));
    }
    return NextResponse.json(status);
  } catch (err) {
    return upstreamError(err, "Couldn't check Quest Special. Try again.");
  }
}
