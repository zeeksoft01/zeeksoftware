import mongoose, { Schema, Model } from 'mongoose';
import { EmailSendLog } from '../types';

const emailSendLogSchema = new Schema<EmailSendLog>(
  {
    id: { type: String, required: true, unique: true, index: true },
    campaignId: { type: String, sparse: true, index: true },
    dailyKey: { type: String, sparse: true, index: true },
    orderId: { type: String, sparse: true, index: true },
    sendType: {
      type: String,
      enum: ['campaign', 'daily_automation', 'transactional', 'thank_you', 'test'],
      required: true,
      index: true,
    },
    recipientEmail: { type: String, required: true, trim: true, lowercase: true, index: true },
    recipientName: { type: String },
    subject: { type: String, required: true },
    status: {
      type: String,
      enum: ['queued', 'sending', 'sent', 'delivered', 'failed', 'bounced'],
      default: 'queued',
      index: true,
    },
    attempts: { type: Number, default: 0 },
    maxAttempts: { type: Number, default: 3 },
    nextRetryAt: { type: String, index: true },
    provider: { type: String },
    messageId: { type: String, sparse: true, index: true },
    error: { type: String },
    openedAt: { type: String },
    openCount: { type: Number, default: 0 },
    clickedAt: { type: String },
    clickCount: { type: Number, default: 0 },
    sentAt: { type: String, index: true },
    createdAt: { type: String, default: () => new Date().toISOString(), index: true },
    updatedAt: { type: String, default: () => new Date().toISOString() },
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

emailSendLogSchema.index(
  { campaignId: 1, recipientEmail: 1 },
  { unique: true, partialFilterExpression: { campaignId: { $type: 'string' } } }
);
emailSendLogSchema.index(
  { dailyKey: 1, recipientEmail: 1 },
  { unique: true, partialFilterExpression: { dailyKey: { $type: 'string' } } }
);
emailSendLogSchema.index({ orderId: 1, sendType: 1 });

export const EmailSendLogModel: Model<EmailSendLog> =
  mongoose.models.EmailSendLog || mongoose.model<EmailSendLog>('EmailSendLog', emailSendLogSchema);
