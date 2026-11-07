import "server-only";
import { connectDB } from "@/lib/db";
import { Generation } from "@/lib/models/generation";

/** Best-effort usage log. A failure here must never affect the user's request. */
export async function logGeneration(entry: {
  userId: string;
  service: string;
  ok: boolean;
  codes?: number;
  started: number;
  error?: string;
}) {
  try {
    await connectDB();
    await Generation.create({
      userId: entry.userId,
      service: entry.service,
      ok: entry.ok,
      codes: entry.codes ?? 0,
      latencyMs: Date.now() - entry.started,
      error: entry.error,
    });
  } catch (err) {
    console.error("[generation-log] couldn't write", err);
  }
}

/**
 * Quest Special ends on the external API's clock and we only learn of it while polling, so key the
 * row by the result's own timestamp: polling twice records it once.
 */
export async function logQuestSpecialResult(entry: {
  userId: string;
  resultAt: number;
  found: boolean;
  codes: number;
}) {
  try {
    await connectDB();
    await Generation.updateOne(
      { userId: entry.userId, service: "quest_special", at: new Date(entry.resultAt) },
      {
        $setOnInsert: {
          userId: entry.userId,
          service: "quest_special",
          // A scan that ends with no safe slip is a normal outcome, not a failure.
          ok: true,
          codes: entry.found ? entry.codes : 0,
          at: new Date(entry.resultAt),
        },
      },
      { upsert: true },
    );
  } catch (err) {
    console.error("[generation-log] couldn't write quest special", err);
  }
}
