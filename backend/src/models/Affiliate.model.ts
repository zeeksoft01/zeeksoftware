import mongoose, { Schema, Model } from 'mongoose';

export interface AffiliateRecord {
  _id?: mongoose.Types.ObjectId | string;
  userId: mongoose.Types.ObjectId | string; // References User._id in users collection
  referralCode: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
  availableBalance: number;
  pendingBalance: number;
  totalEarned: number;
  totalWithdrawn: number;
  reservedWithdrawalBalance: number;
  totalReferredSalesCount: number;
  totalClicks: number;
  createdAt: string;
  updatedAt: string;
}

const affiliateSchema = new Schema<AffiliateRecord>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      required: true,
      unique: true,
      index: true,
      ref: 'User',
    },
    referralCode: { type: String, required: true, unique: true, uppercase: true, trim: true, index: true },
    bankName: { type: String, trim: true, default: '' },
    accountNumber: { type: String, trim: true, default: '' },
    accountName: { type: String, trim: true, default: '' },
    availableBalance: { type: Number, default: 0, min: 0 },
    pendingBalance: { type: Number, default: 0, min: 0 },
    totalEarned: { type: Number, default: 0, min: 0 },
    totalWithdrawn: { type: Number, default: 0, min: 0 },
    reservedWithdrawalBalance: { type: Number, default: 0, min: 0 },
    totalReferredSalesCount: { type: Number, default: 0, min: 0 },
    totalClicks: { type: Number, default: 0, min: 0 },
    createdAt: { type: String, default: () => new Date().toISOString() },
    updatedAt: { type: String, default: () => new Date().toISOString() },
  },
  {
    versionKey: false,
    collection: 'affiliates',
    toJSON: {
      transform: (_doc, ret) => {
        const obj = ret as Record<string, unknown>;
        if (obj._id !== undefined) obj._id = String(obj._id);
        if (obj.userId !== undefined) obj.userId = String(obj.userId);
        return obj;
      },
    },
  }
);

export const AffiliateModel: Model<AffiliateRecord> =
  mongoose.models.Affiliate || mongoose.model<AffiliateRecord>('Affiliate', affiliateSchema);
