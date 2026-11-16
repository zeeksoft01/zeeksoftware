import mongoose, { Schema, Model } from 'mongoose';
import { AffiliateCommission } from '../types';

const affiliateCommissionSchema = new Schema<AffiliateCommission>(
  {
    id: { type: String, required: true, unique: true, index: true },
    affiliateId: { type: String, required: true, index: true },
    orderId: { type: String, required: true, unique: true, index: true },
    productId: { type: String, required: true },
    productName: { type: String, required: true },
    productDuration: { type: String, required: true },
    orderAmount: { type: Number, required: true, min: 0 },
    commissionRate: { type: Number, required: true, min: 0, max: 100 },
    commissionAmount: { type: Number, required: true, min: 0 },
    status: { type: String, enum: ['eligible', 'pending', 'reversed'], default: 'eligible', index: true },
    createdAt: { type: String, default: () => new Date().toISOString(), index: true },
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

export const AffiliateCommissionModel: Model<AffiliateCommission> =
  mongoose.models.AffiliateCommission ||
  mongoose.model<AffiliateCommission>('AffiliateCommission', affiliateCommissionSchema);
