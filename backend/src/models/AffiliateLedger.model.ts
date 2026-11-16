import mongoose, { Schema, Model } from 'mongoose';
import { AffiliateLedgerEntry } from '../types';

const affiliateLedgerSchema = new Schema<AffiliateLedgerEntry>(
  {
    id: { type: String, required: true, unique: true, index: true },
    affiliateId: { type: String, required: true, index: true },
    type: {
      type: String,
      enum: [
        'commission',
        'withdrawal_reserve',
        'withdrawal_success',
        'withdrawal_declined_refund',
        'admin_credit',
        'admin_debit',
      ],
      required: true,
    },
    amount: { type: Number, required: true },
    referenceId: { type: String },
    description: { type: String, required: true },
    balanceBefore: { type: Number, required: true },
    balanceAfter: { type: Number, required: true },
    adminUser: { type: String },
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

export const AffiliateLedgerModel: Model<AffiliateLedgerEntry> =
  mongoose.models.AffiliateLedger ||
  mongoose.model<AffiliateLedgerEntry>('AffiliateLedger', affiliateLedgerSchema);
