import mongoose, { Schema, Model } from 'mongoose';
import { EmailContact } from '../types';

const emailContactSchema = new Schema<EmailContact>(
  {
    id: { type: String, required: true, unique: true, index: true },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true, index: true },
    fullName: { type: String, trim: true, default: '' },
    whatsApp: { type: String, trim: true },
    source: {
      type: String,
      enum: [
        'customer_registration',
        'affiliate_registration',
        'checkout',
        'purchase',
        'contact_form',
        'manual',
        'csv_import',
        'paste_import',
        'sync',
      ],
      default: 'manual',
      index: true,
    },
    categories: { type: [String], default: ['All Contacts'], index: true },
    userId: { type: String, sparse: true, index: true },
    affiliateId: { type: String, sparse: true, index: true },
    orderCount: { type: Number, default: 0, min: 0 },
    paidOrderCount: { type: Number, default: 0, min: 0 },
    totalSpent: { type: Number, default: 0, min: 0 },
    lastPurchaseAt: { type: String, index: true },
    purchasedProductIds: { type: [String], default: [], index: true },
    marketingConsent: {
      type: String,
      enum: ['subscribed', 'pending', 'unsubscribed', 'suppressed'],
      default: 'pending',
      index: true,
    },
    consentSource: { type: String },
    consentTimestamp: { type: String },
    unsubscribeToken: { type: String, required: true, unique: true, index: true },
    unsubscribedAt: { type: String },
    unsubscribeReason: { type: String },
    bounceCount: { type: Number, default: 0, min: 0 },
    lastBounceReason: { type: String },
    suppressedAt: { type: String },
    notes: { type: String },
    collectedAt: { type: String, default: () => new Date().toISOString(), index: true },
    createdAt: { type: String, default: () => new Date().toISOString() },
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

export const EmailContactModel: Model<EmailContact> =
  mongoose.models.EmailContact || mongoose.model<EmailContact>('EmailContact', emailContactSchema);
