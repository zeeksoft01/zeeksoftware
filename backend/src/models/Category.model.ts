import mongoose, { Schema, Model } from 'mongoose';

export interface CategoryDocument {
  id: string;
  name: string;
  displayOrder: number;
}

const categorySchema = new Schema<CategoryDocument>(
  {
    id: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, unique: true, trim: true },
    displayOrder: { type: Number, default: 0, index: true },
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

export const CategoryModel: Model<CategoryDocument> =
  mongoose.models.Category || mongoose.model<CategoryDocument>('Category', categorySchema);
