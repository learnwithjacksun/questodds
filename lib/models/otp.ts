import "server-only";
import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const otpSchema = new Schema({
  email: { type: String, required: true, unique: true, lowercase: true },
  codeHash: { type: String, required: true },
  attempts: { type: Number, default: 0 },
  // Username chosen at registration; the user is created only once the code is verified.
  username: { type: String },
  dateOfBirth: { type: String }, // YYYY-MM-DD, already age-checked
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true, index: { expireAfterSeconds: 0 } },
});

export type OtpDoc = InferSchemaType<typeof otpSchema>;

export const Otp: Model<OtpDoc> =
  (mongoose.models.Otp as Model<OtpDoc>) || mongoose.model<OtpDoc>("Otp", otpSchema);
