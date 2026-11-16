import mongoose, { Schema, Model } from 'mongoose';
import { ReferralAttribution } from '../types';

const referralAttributionSchema = new Schema<ReferralAttribution>(
  {
    id: { type: String, required: true, unique: true, index: true },
    customerEmail: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    customerName: { type: String, trim: true },
    customerWhatsApp: { type: String, trim: true },
    affiliateId: { type: String, required: true, index: true },
    referralCode: { type: String, required: true, index: true },
    firstOrderId: { type: String },
    firstCommissionOrderId: { type: String },
    firstPurchaseCompleted: { type: Boolean, default: false, index: true },
    totalOrdersCount: { type: Number, default: 0, min: 0 },
    totalCommissionedOrdersCount: { type: Number, default: 0, min: 0 },
    lastOrderId: { type: String },
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

export const ReferralAttributionModel: Model<ReferralAttribution> =
  mongoose.models.ReferralAttribution ||
  mongoose.model<ReferralAttribution>('ReferralAttribution', referralAttributionSchema);
