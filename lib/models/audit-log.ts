import "server-only";
import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

/** Append-only record of admin activity. Nothing in the app updates or deletes these. */
const auditLogSchema = new Schema(
  {
    actorId: { type: String, index: true },
    actorName: { type: String },
    actorTelegramId: { type: String },
    action: { type: String, required: true, index: true },
    targetType: { type: String },
    targetId: { type: String, index: true },
    meta: { type: Schema.Types.Mixed },
    ip: { type: String },
    userAgent: { type: String },
    at: { type: Date, default: Date.now, index: true },
  },
  { versionKey: false },
);

export type AuditLogDoc = InferSchemaType<typeof auditLogSchema>;

export const AuditLog: Model<AuditLogDoc> =
  (mongoose.models.AuditLog as Model<AuditLogDoc>) || mongoose.model<AuditLogDoc>("AuditLog", auditLogSchema);
