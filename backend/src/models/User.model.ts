import mongoose, { Schema, Model } from 'mongoose';
import { SystemUser } from '../types';

const userSchema = new Schema<SystemUser>(
  {
    fullName: { type: String, required: true, trim: true },
    name: { type: String, trim: true },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true, index: true },
    phone: { type: String, trim: true, default: '' },
    passwordHash: { type: String, required: true },
    profilePicture: { type: String },
    role: {
      type: String,
      enum: ['affiliate', 'admin', 'user'],
      default: 'affiliate',
      index: true,
    },
    status: {
      type: String,
      enum: ['active', 'pending', 'suspended', 'disabled'],
      default: 'active',
      index: true,
    },
    isVerified: { type: Boolean, default: false, index: true },
    isActive: { type: Boolean, default: true, index: true },
    createdBy: { type: String, default: '' },
    verifiedBy: { type: String, default: '' },
    verifiedAt: { type: String, default: '' },
    lastLoginAt: { type: String, default: '' },
    createdAt: { type: String, default: () => new Date().toISOString() },
    updatedAt: { type: String, default: () => new Date().toISOString() },
  },
  {
    versionKey: false,
    collection: 'users',
    toJSON: {
      transform: (_doc, ret) => {
        const obj = ret as Record<string, unknown>;
        if (obj._id !== undefined) {
          obj._id = String(obj._id);
        }
        delete obj.passwordHash;
        return obj;
      },
    },
  }
);

export const UserModel: Model<SystemUser> =
  mongoose.models.User || mongoose.model<SystemUser>('User', userSchema);
