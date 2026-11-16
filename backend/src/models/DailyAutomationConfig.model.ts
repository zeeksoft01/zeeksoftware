import mongoose, { Schema, Model } from 'mongoose';
import { DailyAutomationConfig } from '../types';

const dailyAutomationConfigSchema = new Schema<DailyAutomationConfig>(
  {
    key: { type: String, required: true, unique: true, default: 'daily_automation' },
    enabled: { type: Boolean, default: false },
    sendTime: { type: String, default: '09:00' },
    timezone: { type: String, default: 'Africa/Lagos' },
    targetCategories: { type: [String], default: ['All Contacts'] },
    days: { type: Schema.Types.Mixed, required: true },
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

export const DailyAutomationConfigModel: Model<DailyAutomationConfig> =
  mongoose.models.DailyAutomationConfig ||
  mongoose.model<DailyAutomationConfig>('DailyAutomationConfig', dailyAutomationConfigSchema);
