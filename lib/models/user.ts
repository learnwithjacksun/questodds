import "server-only";
import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const userSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    username: { type: String, required: true, unique: true, lowercase: true, trim: true },
    emailVerifiedAt: { type: Date },
    // Self-declared "I am 18 or older" confirmation at sign-up. Not document verification.
    ageConfirmedAt: { type: Date, required: true },
    // Linked via the Telegram Login Widget (verified server-side). One Telegram ID per account.
    telegramId: { type: String, unique: true, sparse: true },
    telegramUsername: { type: String },
    telegramPhotoUrl: { type: String },
    telegramLinkedAt: { type: Date },
  },
  { timestamps: true },
);

export type UserDoc = InferSchemaType<typeof userSchema>;

export const User: Model<UserDoc> =
  (mongoose.models.User as Model<UserDoc>) || mongoose.model<UserDoc>("User", userSchema);
