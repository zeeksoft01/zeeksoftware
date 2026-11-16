import mongoose, { Schema, Model } from 'mongoose';
import { BenefitCard } from '../types';

const benefitCardSchema = new Schema<BenefitCard>(
  {
    id: { type: String, required: true, unique: true, index: true },
    title: { type: String, required: true },
    text: { type: String, required: true },
    iconName: { type: String, required: true },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: {
      transform: (_doc, ret) => {
        delete (ret as Record<string, unknown>)._id;
        return ret;
      },
    },
  }
);

export const BenefitCardModel: Model<BenefitCard> =
  mongoose.models.BenefitCard || mongoose.model<BenefitCard>('BenefitCard', benefitCardSchema);
