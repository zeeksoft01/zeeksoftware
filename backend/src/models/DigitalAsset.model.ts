import mongoose, { Schema, Model } from 'mongoose';
import { DigitalAsset } from '../types';

const digitalAssetSchema = new Schema<DigitalAsset>(
  {
    id: { type: String, required: true, unique: true, index: true },
    title: { type: String, required: true, trim: true },
    originalFileName: { type: String, required: true },
    storedFileName: { type: String, required: true, unique: true },
    mimeType: { type: String, required: true },
    sizeBytes: { type: Number, required: true, min: 0 },
    sha256: { type: String },
    uploadedBy: { type: String },
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

export const DigitalAssetModel: Model<DigitalAsset> =
  mongoose.models.DigitalAsset || mongoose.model<DigitalAsset>('DigitalAsset', digitalAssetSchema);
