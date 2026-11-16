import mongoose, { Schema, Model } from 'mongoose';
import { FAQItem } from '../types';

const faqSchema = new Schema<FAQItem>(
  {
    id: { type: String, required: true, unique: true, index: true },
    question: { type: String, required: true },
    answer: { type: String, required: true },
    category: { type: String },
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

export const FaqModel: Model<FAQItem> =
  mongoose.models.Faq || mongoose.model<FAQItem>('Faq', faqSchema);
