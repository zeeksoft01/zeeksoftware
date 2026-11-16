import mongoose, { Schema, Model } from 'mongoose';
import { HeroSlide } from '../types';

const heroSlideSchema = new Schema<HeroSlide>(
  {
    id: { type: String, required: true, unique: true, index: true },
    badge: { type: String, required: true },
    headline: { type: String, required: true },
    supportingText: { type: String, required: true },
    cta1Label: { type: String, required: true },
    cta1Action: { type: String, required: true },
    cta2Label: { type: String },
    cta2Action: { type: String },
    backgroundImage: { type: String, required: true },
    bgGradient: { type: String },
    accentColor: { type: String },
    visualType: { type: String, enum: ['photo', 'floating_logos'], default: 'photo' },
    enableFloatingLogos: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true, index: true },
    displayOrder: { type: Number, default: 0, index: true },
    overlayOpacity: { type: Number, default: 0.72 },
    backgroundPosition: { type: String, default: 'center right' },
    textAlignment: { type: String, enum: ['left', 'center', 'right'], default: 'left' },
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

export const HeroSlideModel: Model<HeroSlide> =
  mongoose.models.HeroSlide || mongoose.model<HeroSlide>('HeroSlide', heroSlideSchema);
