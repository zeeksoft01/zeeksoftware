import mongoose, { Schema, Model } from 'mongoose';
import { LegalPolicies } from '../types';

export interface PolicyDocument extends LegalPolicies {
  key: string;
}

const policySchema = new Schema<PolicyDocument>(
  {
    key: { type: String, required: true, unique: true, default: 'legal_policies' },
    lastUpdated: { type: String, required: true },
    privacyPolicy: { type: String, required: true },
    refundPolicy: { type: String, required: true },
    renewalGuidelines: { type: String, required: true },
    affiliateTerms: { type: String },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: {
      transform: (_doc, ret) => {
        const obj = ret as Record<string, unknown>;
        delete obj._id;
        delete obj.key;
        return obj;
      },
    },
  }
);

export const PolicyModel: Model<PolicyDocument> =
  mongoose.models.Policy || mongoose.model<PolicyDocument>('Policy', policySchema);
