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
    // Admin area. Owners can also come from OWNER_TELEGRAM_IDS (see lib/auth/roles.ts).
    role: { type: String, enum: ["user", "admin", "owner"], default: "user" },
    // A suspended account can't sign in or use the API.
    status: { type: String, enum: ["active", "suspended"], default: "active" },
    suspendedReason: { type: String },
    // Bumped to sign the user out everywhere: sessions carry the version they were issued under.
    tokenVersion: { type: Number, default: 0 },
    // Snapshot of the VIP end date from the last subscription lookup (the API can't list subscribers).
    vipUntil: { type: Date },
    // Private notes by admins, never shown to the user.
    adminNote: { type: String, maxlength: 2000 },
  },
  { timestamps: true },
);

export type UserDoc = InferSchemaType<typeof userSchema>;

export const User: Model<UserDoc> =
  (mongoose.models.User as Model<UserDoc>) || mongoose.model<UserDoc>("User", userSchema);
