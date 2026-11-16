import mongoose, { Schema, Model } from 'mongoose';
import { CustomerReview } from '../types';

const reviewSchema = new Schema<CustomerReview>(
  {
    id: { type: String, required: true, unique: true, index: true },
    customerName: { type: String, required: true, trim: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    reviewMessage: { type: String, required: true, trim: true },
    productPurchased: { type: String, trim: true },
    reviewDate: { type: String, required: true },
    isApproved: { type: Boolean, default: false, index: true },
    isFeatured: { type: Boolean, default: false, index: true },
    orderId: { type: String },
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

export const ReviewModel: Model<CustomerReview> =
  mongoose.models.Review || mongoose.model<CustomerReview>('Review', reviewSchema);
