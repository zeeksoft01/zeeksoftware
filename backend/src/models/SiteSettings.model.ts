import mongoose, { Schema, Model } from 'mongoose';
import { SiteSettings } from '../types';

export interface SiteSettingsDocument extends SiteSettings {
  key: string;
}

const usdtNetworkSchema = new Schema(
  {
    network: { type: String, required: true },
    address: { type: String, required: true },
    memo: { type: String },
  },
  { _id: false }
);

const siteSettingsSchema = new Schema<SiteSettingsDocument>(
  {
    key: { type: String, required: true, unique: true, default: 'site_settings' },
    storeName: { type: String, required: true },
    tagline: { type: String, required: true },
    secondaryTagline: { type: String, required: true },
    slogan: { type: String, required: true },
    supportWhatsApp: { type: String, required: true },
    internationalWhatsApp: { type: String, required: true },
    supportEmail: { type: String, required: true },
    telegramUsername: { type: String, required: true },
    telegramChannelUrl: { type: String, required: true },
    whatsappCommunityUrl: { type: String, required: true },
    currency: { type: String, default: 'NGN' },
    logoUrl: { type: String, default: '' },
    lightLogoUrl: { type: String, default: '' },
    darkLogoUrl: { type: String, default: '' },
    faviconUrl: { type: String, default: '' },
    mobileIconUrl: { type: String, default: '' },
    logoWidth: { type: Number, default: 160 },
    logoHeight: { type: Number },
    socialShareImageUrl: { type: String, default: '' },
    bankName: { type: String, required: true },
    accountNumber: { type: String, required: true },
    accountName: { type: String, required: true },
    usdtEnabled: { type: Boolean, default: true },
    usdtNetworks: { type: [usdtNetworkSchema], default: [] },
    usdtNgnRate: { type: Number, default: 1550 },
    usdNgnRate: { type: Number, default: 1550 },
    bybitUid: { type: String, default: '' },
    bybitEnabled: { type: Boolean, default: true },
    binanceUid: { type: String, default: '' },
    binanceEnabled: { type: Boolean, default: true },
    paystackEnabled: { type: Boolean, default: true },
    paystackPublicKey: { type: String, default: '' },
    paystackMode: { type: String, enum: ['test', 'live'], default: 'test' },
    announcementText: { type: String, default: '' },
    announcementActive: { type: Boolean, default: true },
    primaryColor: { type: String, default: '#061B45' },
    accentColor: { type: String, default: '#FF7900' },
    heroAutoplayDuration: { type: Number, default: 4000 },
    heroTransitionSpeed: { type: Number, default: 900 },
    defaultCommissionRate: { type: Number, default: 0 },
    productCommissionRates: { type: Schema.Types.Mixed, default: {} },
    recurringCommissionsEnabled: { type: Boolean, default: true },
    minWithdrawalAmount: { type: Number, default: 100 },
    referralCookieDays: { type: Number, default: 30 },
    affiliateGuide: { type: Schema.Types.Mixed },
    postPaymentConfig: { type: Schema.Types.Mixed },
    emailBranding: { type: Schema.Types.Mixed },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: {
      transform: (_doc, ret) => {
        const obj = ret as Record<string, unknown>;
        delete obj._id;
        delete obj.key;
        return obj;
      },
    },
  }
);

export const SiteSettingsModel: Model<SiteSettingsDocument> =
  mongoose.models.SiteSettings || mongoose.model<SiteSettingsDocument>('SiteSettings', siteSettingsSchema);
