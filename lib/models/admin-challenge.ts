import "server-only";
import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

/** One pending admin sign-in code per user (separate from the user login OTPs). */
const adminChallengeSchema = new Schema({
  userId: { type: String, required: true, unique: true },
  codeHash: { type: String, required: true },
  attempts: { type: Number, default: 0 },
  lockedUntil: { type: Date },
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true, index: { expires: 0 } },
});

export type AdminChallengeDoc = InferSchemaType<typeof adminChallengeSchema>;

export const AdminChallenge: Model<AdminChallengeDoc> =
  (mongoose.models.AdminChallenge as Model<AdminChallengeDoc>) ||
  mongoose.model<AdminChallengeDoc>("AdminChallenge", adminChallengeSchema);
