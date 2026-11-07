import "server-only";
import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

/** Website payments only. The Telegram bot's own payments never pass through here. */
const paymentSchema = new Schema(
  {
    reference: { type: String, required: true, unique: true },
    userId: { type: String, required: true, index: true },
    /** Only when the account had Telegram linked at checkout. */
    telegramId: { type: String },
    /** Price we expect (plan price) and what the payment provider actually quoted. */
    expectedAmount: { type: Number, required: true },
    quotedAmount: { type: Number },
    /** Subscription end (epoch ms) when checkout started. Lets us spot a payment that added more than one plan. */
    expiryBefore: { type: Number },
    status: { type: String, enum: ["initiated", "paid"], default: "initiated", index: true },
    paidAt: { type: Date },
    createdAt: { type: Date, default: Date.now, index: true },
  },
  { versionKey: false },
);

export type PaymentDoc = InferSchemaType<typeof paymentSchema>;

export const Payment: Model<PaymentDoc> =
  (mongoose.models.Payment as Model<PaymentDoc>) || mongoose.model<PaymentDoc>("Payment", paymentSchema);
