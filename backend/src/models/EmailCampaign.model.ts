import mongoose, { Schema, Model } from 'mongoose';
import { EmailCampaign } from '../types';

const emailCampaignSchema = new Schema<EmailCampaign>(
  {
    id: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, trim: true },
    subject: { type: String, required: true, trim: true },
    preheader: { type: String },
    htmlBody: { type: String, required: true },
    textBody: { type: String },
    bannerImageUrl: { type: String },
    ctaLabel: { type: String },
    ctaUrl: { type: String },
    targetType: {
      type: String,
      enum: ['all', 'categories', 'individuals', 'segments'],
      default: 'categories',
    },
    targetCategories: { type: [String], default: [] },
    targetProductIds: { type: [String], default: [] },
    inactiveDays: { type: Number },
    neverPurchasedOnly: { type: Boolean, default: false },
    targetEmails: { type: [String], default: [] },
    status: {
      type: String,
      enum: ['draft', 'scheduled', 'queued', 'sending', 'paused', 'completed', 'cancelled', 'failed'],
      default: 'draft',
      index: true,
    },
    scheduledFor: { type: String, index: true },
    totalRecipients: { type: Number, default: 0 },
    sentCount: { type: Number, default: 0 },
    deliveredCount: { type: Number, default: 0 },
    failedCount: { type: Number, default: 0 },
    bouncedCount: { type: Number, default: 0 },
    openCount: { type: Number, default: 0 },
    clickCount: { type: Number, default: 0 },
    unsubscribeCount: { type: Number, default: 0 },
    startedAt: { type: String },
    completedAt: { type: String },
    lastError: { type: String },
    createdBy: { type: String },
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

export const EmailCampaignModel: Model<EmailCampaign> =
  mongoose.models.EmailCampaign || mongoose.model<EmailCampaign>('EmailCampaign', emailCampaignSchema);
