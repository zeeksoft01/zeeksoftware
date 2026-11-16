import mongoose, { Schema, Model } from 'mongoose';
import { ProductDeliveryRecord } from '../types';

const productDeliveryRecordSchema = new Schema<ProductDeliveryRecord>(
  {
    id: { type: String, required: true, unique: true, index: true },
    orderId: { type: String, required: true, index: true },
    productId: { type: String, required: true, index: true },
    productName: { type: String, required: true },
    customerName: { type: String, required: true },
    customerEmail: { type: String, required: true, trim: true, lowercase: true, index: true },
    customerWhatsApp: { type: String },
    paymentStatus: {
      type: String,
      enum: ['pending', 'awaiting_verification', 'paid', 'failed', 'refunded'],
      default: 'pending',
      index: true,
    },
    destinationType: {
      type: String,
      enum: ['whatsapp', 'custom_url', 'digital_download'],
      required: true,
    },
    destinationUrl: { type: String },
    digitalAssetId: { type: String, sparse: true },
    digitalFileName: { type: String },
    downloadToken: { type: String, required: true, unique: true, index: true },
    downloadEnabled: { type: Boolean, default: true },
    deliveryStatus: {
      type: String,
      enum: ['pending_payment', 'link_generated', 'delivered', 'downloaded', 'revoked'],
      default: 'pending_payment',
      index: true,
    },
    downloadCount: { type: Number, default: 0, min: 0 },
    firstAccessedAt: { type: String },
    lastAccessedAt: { type: String },
    lastCompletedAt: { type: String },
    resentCount: { type: Number, default: 0, min: 0 },
    lastResentAt: { type: String },
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

productDeliveryRecordSchema.index({ orderId: 1, productId: 1 }, { unique: true });

export const ProductDeliveryRecordModel: Model<ProductDeliveryRecord> =
  mongoose.models.ProductDeliveryRecord ||
  mongoose.model<ProductDeliveryRecord>('ProductDeliveryRecord', productDeliveryRecordSchema);
