import mongoose, { Schema, Model } from 'mongoose';
import { Order, OrderItem } from '../types';

const orderItemSchema = new Schema<OrderItem>(
  {
    productId: { type: String, required: true },
    productName: { type: String, required: true },
    duration: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
    category: { type: String, required: true },
  },
  { _id: false }
);

const orderSchema = new Schema<Order>(
  {
    id: { type: String, required: true, unique: true, index: true },
    customerName: { type: String, required: true, trim: true },
    customerEmail: { type: String, required: true, trim: true, lowercase: true, index: true },
    customerWhatsApp: { type: String, required: true, trim: true, index: true },
    items: { type: [orderItemSchema], required: true },
    totalAmount: { type: Number, required: true, min: 0 },
    paymentMethod: {
      type: String,
      enum: ['Paystack', 'Direct Bank Transfer', 'USDT', 'Bybit', 'Binance'],
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'awaiting_verification', 'paid', 'failed', 'refunded'],
      default: 'pending',
      index: true,
    },
    fulfillmentStatus: {
      type: String,
      enum: [
        'Awaiting Payment',
        'Payment Submitted',
        'Payment Confirmed',
        'Awaiting Fulfillment',
        'Processing',
        'Delivered',
        'Activation Completed',
        'Support Required',
        'Refunded',
        'Cancelled',
      ],
      default: 'Awaiting Payment',
      index: true,
    },
    paymentReference: { type: String, sparse: true, index: true },
    transactionHash: { type: String },
    proofNote: { type: String },
    proofImage: { type: String },
    verifiedBy: { type: String },
    verifiedAt: { type: String },
    fulfillmentNotes: { type: String },
    activationCredentials: { type: String },
    referralCode: { type: String, index: true },
    affiliateId: { type: String, index: true },
    commissionAwarded: { type: Boolean, default: false },
    commissionSkippedReason: { type: String },
    thankYouEmailSentAt: { type: String },
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

export const OrderModel: Model<Order> =
  mongoose.models.Order || mongoose.model<Order>('Order', orderSchema);
