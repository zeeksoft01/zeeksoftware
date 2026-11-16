import mongoose, { Schema, Model } from 'mongoose';
import { ContactMessage, InquiryReply } from '../types';

const inquiryReplySchema = new Schema<InquiryReply>(
  {
    id: { type: String, required: true },
    toEmail: { type: String, required: true, trim: true, lowercase: true },
    subject: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    sentBy: { type: String, required: true },
    sentAt: { type: String, required: true },
    status: { type: String, enum: ['sent', 'failed'], default: 'sent' },
    messageId: { type: String },
    error: { type: String },
  },
  { _id: false }
);

const inquirySchema = new Schema<ContactMessage>(
  {
    id: { type: String, required: true, unique: true, index: true },
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    whatsApp: { type: String, trim: true },
    subject: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    createdAt: { type: String, default: () => new Date().toISOString(), index: true },
    updatedAt: { type: String, default: () => new Date().toISOString() },
    isRead: { type: Boolean, default: false, index: true },
    status: {
      type: String,
      enum: ['New', 'Replied', 'Awaiting Response', 'Resolved'],
      default: 'New',
      index: true,
    },
    replies: { type: [inquiryReplySchema], default: [] },
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

export const InquiryModel: Model<ContactMessage> =
  mongoose.models.Inquiry || mongoose.model<ContactMessage>('Inquiry', inquirySchema);
