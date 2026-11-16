import mongoose, { Schema, Model } from 'mongoose';
import { Product } from '../types';

const productSchema = new Schema<Product>(
  {
    id: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true, index: true },
    image: { type: String, required: true },
    shortDescription: { type: String, required: true },
    detailedDescription: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    priceSourceCurrency: { type: String, enum: ['NGN', 'USD'], default: 'NGN' },
    usdPrice: { type: Number, min: 0 },
    duration: { type: String, required: true, trim: true },
    isAvailable: { type: Boolean, default: true, index: true },
    isFeatured: { type: Boolean, default: false, index: true },
    seoTitle: { type: String },
    seoDescription: { type: String },
    fulfillmentInstructions: { type: String },
    displayOrder: { type: Number, default: 0, index: true },
    commissionRateOverride: { type: Number, min: 0, max: 100 },
    deliveryConfig: { type: Schema.Types.Mixed },
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

export const ProductModel: Model<Product> =
  mongoose.models.Product || mongoose.model<Product>('Product', productSchema);
