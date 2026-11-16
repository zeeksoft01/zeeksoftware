import mongoose, { Schema, Model } from 'mongoose';
import { ReferralClick } from '../types';

const referralClickSchema = new Schema<ReferralClick>(
  {
    id: { type: String, required: true, unique: true, index: true },
    affiliateId: { type: String, required: true, index: true },
    referralCode: { type: String, required: true, index: true },
    targetPath: { type: String },
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

export const ReferralClickModel: Model<ReferralClick> =
  mongoose.models.ReferralClick || mongoose.model<ReferralClick>('ReferralClick', referralClickSchema);
