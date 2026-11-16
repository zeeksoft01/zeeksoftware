import mongoose, { Schema, Model } from 'mongoose';
import { AuditLog } from '../types';

const auditLogSchema = new Schema<AuditLog>(
  {
    id: { type: String, required: true, unique: true, index: true },
    action: { type: String, required: true },
    details: { type: String, required: true },
    adminUser: { type: String, default: 'Admin' },
    timestamp: { type: String, default: () => new Date().toISOString(), index: true },
  },
  {
    versionKey: false,
    toJSON: {
      transform: (_doc, ret) => {
        delete (ret as Record<string, unknown>)._id;
        return ret;
      },
    },
  }
);

export const AuditLogModel: Model<AuditLog> =
  mongoose.models.AuditLog || mongoose.model<AuditLog>('AuditLog', auditLogSchema);
