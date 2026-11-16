import mongoose, { Schema, Model } from 'mongoose';
import { AffiliateWithdrawal } from '../types';

const affiliateWithdrawalSchema = new Schema<AffiliateWithdrawal>(
  {
    id: { type: String, required: true, unique: true, index: true },
    affiliateId: { type: String, required: true, index: true },
    affiliateName: { type: String, required: true },
    affiliateEmail: { type: String, required: true },
    amount: { type: Number, required: true, min: 1 },
    bankName: { type: String, required: true },
    accountNumber: { type: String, required: true },
    accountName: { type: String, required: true },
    status: {
      type: String,
      enum: [
        'Pending Review',
        'Approved',
        'Processing Payment',
        'Payment Sent',
        'Withdrawal Successful',
        'Declined',
      ],
      default: 'Pending Review',
      index: true,
    },
    rejectionReason: { type: String },
    transferReference: { type: String },
    paymentDate: { type: String },
    adminNotes: { type: String },
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

export const AffiliateWithdrawalModel: Model<AffiliateWithdrawal> =
  mongoose.models.AffiliateWithdrawal ||
  mongoose.model<AffiliateWithdrawal>('AffiliateWithdrawal', affiliateWithdrawalSchema);
