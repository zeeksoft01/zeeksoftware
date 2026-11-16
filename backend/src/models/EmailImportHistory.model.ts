import mongoose, { Schema, Model } from 'mongoose';
import { EmailImportHistoryItem } from '../types';

const emailImportHistorySchema = new Schema<EmailImportHistoryItem>(
  {
    id: { type: String, required: true, unique: true, index: true },
    fileName: { type: String, required: true, trim: true },
    source: { type: String, enum: ['csv_import', 'paste_import'], default: 'csv_import' },
    duplicateMode: { type: String, enum: ['skip', 'update'], default: 'skip' },
    categories: { type: [String], default: ['New Emails'] },
    hasPermissionToEmail: { type: Boolean, default: false },
    totalRows: { type: Number, default: 0 },
    imported: { type: Number, default: 0 },
    updated: { type: Number, default: 0 },
    skippedExisting: { type: Number, default: 0 },
    duplicatesSkipped: { type: Number, default: 0 },
    suppressedProtected: { type: Number, default: 0 },
    invalidCount: { type: Number, default: 0 },
    invalidSample: { type: [String], default: [] },
    importedBy: { type: String, default: 'Admin' },
    createdAt: { type: String, default: () => new Date().toISOString(), index: true },
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

export const EmailImportHistoryModel: Model<EmailImportHistoryItem> =
  mongoose.models.EmailImportHistory ||
  mongoose.model<EmailImportHistoryItem>('EmailImportHistory', emailImportHistorySchema);
