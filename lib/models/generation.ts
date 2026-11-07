import "server-only";
import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

/** One row per code-generation run or Quest Special scan, kept for usage and reliability stats. */
const generationSchema = new Schema(
  {
    userId: { type: String, required: true, index: true },
    service: { type: String, required: true },
    ok: { type: Boolean, required: true },
    /** Booking codes minted (0 on failure or when nothing was safe). */
    codes: { type: Number, default: 0 },
    latencyMs: { type: Number },
    /** For failures: a short non-sensitive reason. */
    error: { type: String },
    at: { type: Date, default: Date.now, index: true },
  },
  { versionKey: false },
);

export type GenerationDoc = InferSchemaType<typeof generationSchema>;

export const Generation: Model<GenerationDoc> =
  (mongoose.models.Generation as Model<GenerationDoc>) ||
  mongoose.model<GenerationDoc>("Generation", generationSchema);
