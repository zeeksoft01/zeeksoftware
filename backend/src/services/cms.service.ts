import {
  HeroSlide,
  BenefitCard,
  CustomerReview,
  SiteSettings,
  FAQItem,
  LegalPolicies,
  ContactMessage,
  InquiryReply,
  InquiryStatus,
} from '../types';
import {
  CategoryModel,
  HeroSlideModel,
  BenefitCardModel,
  ReviewModel,
  FaqModel,
  PolicyModel,
  SiteSettingsModel,
  InquiryModel,
  ProductModel,
} from '../models';
import { requireDatabaseConnection } from '../config/database';
import {
  INITIAL_CATEGORIES,
  INITIAL_HERO_SLIDES,
  INITIAL_BENEFITS,
  INITIAL_FAQS,
  INITIAL_POLICIES,
  DEFAULT_AFFILIATE_GUIDE,
  DEFAULT_POST_PAYMENT_CONFIG,
  DEFAULT_EMAIL_BRANDING,
  getInitialSettings,
} from '../utils/seedData';
import { productService } from './product.service';
import { auditService } from './audit.service';
import { uploadService } from './upload.service';
import { emailService, escapeHtml } from './email.service';
import { ApiError } from '../utils/ApiError';

const stripMongoMeta = <T extends object>(doc: T & { _id?: unknown; key?: unknown }): Omit<T, '_id' | 'key'> => {
  const { _id: _ignoredId, key: _ignoredKey, ...rest } = doc;
  return rest as Omit<T, '_id' | 'key'>;
};

export const cmsService = {
  async getSettings(): Promise<SiteSettings> {
    requireDatabaseConnection();
    const defaults = getInitialSettings();
    const doc = await SiteSettingsModel.findOne({ key: 'site_settings' }).lean();
    if (doc) {
      const stripped = stripMongoMeta(doc) as Partial<SiteSettings>;
      return {
        ...defaults,
        ...stripped,
        defaultCommissionRate:
          typeof stripped.defaultCommissionRate === 'number' && !Number.isNaN(stripped.defaultCommissionRate)
            ? stripped.defaultCommissionRate
            : 0,
        usdNgnRate:
          typeof stripped.usdNgnRate === 'number' && stripped.usdNgnRate > 0
            ? stripped.usdNgnRate
            : stripped.usdtNgnRate || defaults.usdNgnRate,
        recurringCommissionsEnabled:
          typeof stripped.recurringCommissionsEnabled === 'boolean'
            ? stripped.recurringCommissionsEnabled
            : defaults.recurringCommissionsEnabled,
        productCommissionRates: stripped.productCommissionRates || defaults.productCommissionRates,
        affiliateGuide: stripped.affiliateGuide
          ? {
              ...DEFAULT_AFFILIATE_GUIDE,
              ...stripped.affiliateGuide,
              highlightCards:
                Array.isArray(stripped.affiliateGuide.highlightCards) &&
                stripped.affiliateGuide.highlightCards.length > 0
                  ? stripped.affiliateGuide.highlightCards
                  : DEFAULT_AFFILIATE_GUIDE.highlightCards,
              sections: Array.isArray(stripped.affiliateGuide.sections)
                ? stripped.affiliateGuide.sections
                : DEFAULT_AFFILIATE_GUIDE.sections,
            }
          : DEFAULT_AFFILIATE_GUIDE,
        postPaymentConfig: {
          ...DEFAULT_POST_PAYMENT_CONFIG,
          ...(stripped.postPaymentConfig || {}),
        },
        emailBranding: {
          ...DEFAULT_EMAIL_BRANDING,
          ...(stripped.emailBranding || {}),
        },
      };
    }
    await SiteSettingsModel.create({ key: 'site_settings', ...defaults });
    return defaults;
  },

  async updateSettings(updates: Partial<SiteSettings>, adminUser = 'Admin'): Promise<SiteSettings> {
    requireDatabaseConnection();
    const resolvedUpdates: Partial<SiteSettings> = { ...updates };
    const imageFields: Array<
      keyof Pick<
        SiteSettings,
        'logoUrl' | 'lightLogoUrl' | 'darkLogoUrl' | 'faviconUrl' | 'mobileIconUrl' | 'socialShareImageUrl'
      >
    > = ['logoUrl', 'lightLogoUrl', 'darkLogoUrl', 'faviconUrl', 'mobileIconUrl', 'socialShareImageUrl'];

    for (const field of imageFields) {
      const val = resolvedUpdates[field];
      if (typeof val === 'string' && val.trim()) {
        resolvedUpdates[field] = await uploadService.resolveCloudinaryImageUrl(val, {
          fileName: String(field),
          folder: 'brand',
        });
      }
    }

    if (resolvedUpdates.affiliateGuide) {
      const guide = { ...resolvedUpdates.affiliateGuide };
      if (guide.heroImageUrl && guide.heroImageUrl.trim()) {
        guide.heroImageUrl = await uploadService.resolveCloudinaryImageUrl(guide.heroImageUrl, {
          fileName: 'affiliate-guide-hero',
          folder: 'cms',
        });
      }
      if (Array.isArray(guide.sections)) {
        guide.sections = await Promise.all(
          guide.sections.map(async (sec, idx) => ({
            ...sec,
            displayOrder: sec.displayOrder ?? idx + 1,
            imageUrl:
              sec.imageUrl && sec.imageUrl.trim()
                ? await uploadService.resolveCloudinaryImageUrl(sec.imageUrl, {
                    fileName: sec.id || `affiliate-guide-step-${idx + 1}`,
                    folder: 'cms',
                  })
                : sec.imageUrl,
          }))
        );
      }
      resolvedUpdates.affiliateGuide = guide;
    }

    // If productCommissionRates map is updated via settings, sync Product.commissionRateOverride too
    if (resolvedUpdates.productCommissionRates && typeof resolvedUpdates.productCommissionRates === 'object') {
      const ratesMap = resolvedUpdates.productCommissionRates;
      const allProducts = await ProductModel.find({}, { id: 1 }).lean();
      const bulkOps = allProducts.map((p) => {
        const rate = ratesMap[p.id];
        if (typeof rate === 'number' && !Number.isNaN(rate) && rate >= 0 && rate <= 100) {
          return {
            updateOne: {
              filter: { id: p.id },
              update: { $set: { commissionRateOverride: rate } },
            },
          };
        }
        return {
          updateOne: {
            filter: { id: p.id },
            update: { $unset: { commissionRateOverride: 1 } },
          },
        };
      });
      if (bulkOps.length > 0) {
        await ProductModel.bulkWrite(bulkOps);
      }
    }

    // Prevent accidental overwrite via updateSettings unless explicit; if usdNgnRate changed, recalculate USD products
    const previous = await this.getSettings();
    const rateChanged =
      typeof resolvedUpdates.usdNgnRate === 'number' &&
      resolvedUpdates.usdNgnRate > 0 &&
      resolvedUpdates.usdNgnRate !== previous.usdNgnRate;

    const updated = await SiteSettingsModel.findOneAndUpdate(
      { key: 'site_settings' },
      { $set: resolvedUpdates },
      { new: true, upsert: true }
    ).lean();

    if (rateChanged && resolvedUpdates.usdNgnRate) {
      await this.recalculateUsdProductPrices(resolvedUpdates.usdNgnRate);
      await auditService.addLog(
        'Update USD Exchange Rate',
        `Admin updated manual USD exchange rate from ₦${previous.usdNgnRate} to ₦${resolvedUpdates.usdNgnRate}.`,
        adminUser
      );
    } else {
      await auditService.addLog('Update Settings', 'Updated store business, affiliate & payment settings', adminUser);
    }

    return this.getSettings();
  },

  async recalculateUsdProductPrices(usdNgnRate: number): Promise<number> {
    requireDatabaseConnection();
    const usdProducts = await ProductModel.find({
      priceSourceCurrency: 'USD',
      usdPrice: { $gt: 0 },
    }).lean();

    if (usdProducts.length === 0) return 0;

    const bulkOps = usdProducts
      .filter((p) => typeof p.usdPrice === 'number' && p.usdPrice > 0)
      .map((p) => ({
        updateOne: {
          filter: { id: p.id },
          update: { $set: { price: Math.round((p.usdPrice as number) * usdNgnRate) } },
        },
      }));

    if (bulkOps.length > 0) {
      await ProductModel.bulkWrite(bulkOps);
    }
    return bulkOps.length;
  },

  async updateExchangeRate(
    usdNgnRate: number,
    options?: { syncUsdtRate?: boolean; adminUser?: string }
  ): Promise<{ settings: SiteSettings; updatedProductsCount: number }> {
    requireDatabaseConnection();
    if (!Number.isFinite(usdNgnRate) || usdNgnRate <= 0) {
      throw new Error('Exchange rate must be a positive number.');
    }

    const previous = await this.getSettings();
    const setPayload: Partial<SiteSettings> = {
      usdNgnRate,
      ...(options?.syncUsdtRate ? { usdtNgnRate: usdNgnRate } : {}),
    };

    await SiteSettingsModel.findOneAndUpdate(
      { key: 'site_settings' },
      { $set: setPayload },
      { new: true, upsert: true }
    );

    const updatedProductsCount = await this.recalculateUsdProductPrices(usdNgnRate);

    await auditService.addLog(
      'Update USD Exchange Rate',
      `Manual USD/NGN exchange rate changed from ₦${previous.usdNgnRate.toLocaleString('en-NG')} to ₦${usdNgnRate.toLocaleString('en-NG')}. Recalculated ${updatedProductsCount} USD-priced product(s).`,
      options?.adminUser || 'Admin'
    );

    const settings = await this.getSettings();
    return { settings, updatedProductsCount };
  },

  async getHeroSlides(onlyActive = false): Promise<HeroSlide[]> {
    requireDatabaseConnection();
    const filter = onlyActive ? { isActive: true } : {};
    const docs = await HeroSlideModel.find(filter).sort({ displayOrder: 1 }).lean();
    return docs.map((d) => stripMongoMeta(d) as HeroSlide);
  },

  async updateHeroSlides(slides: HeroSlide[]): Promise<HeroSlide[]> {
    requireDatabaseConnection();
    const normalized = await Promise.all(
      slides.map(async (s, idx) => ({
        ...s,
        backgroundImage: s.backgroundImage
          ? await uploadService.resolveCloudinaryImageUrl(s.backgroundImage, {
              fileName: s.id || `slide-${idx + 1}`,
              folder: 'hero-slides',
            })
          : s.backgroundImage,
        displayOrder: s.displayOrder ?? idx + 1,
      }))
    );
    await HeroSlideModel.deleteMany({});
    if (normalized.length > 0) {
      await HeroSlideModel.insertMany(normalized);
    }
    await auditService.addLog('Update Hero Slides', `Saved ${normalized.length} hero slides`);
    return normalized;
  },

  async resetDefaultSlides(): Promise<HeroSlide[]> {
    requireDatabaseConnection();
    const defaults = [...INITIAL_HERO_SLIDES];
    await HeroSlideModel.deleteMany({});
    await HeroSlideModel.insertMany(defaults);
    await auditService.addLog('Reset Hero Slides', 'Restored 4 default luxury hero slides');
    return defaults;
  },

  async getBenefitCards(): Promise<BenefitCard[]> {
    requireDatabaseConnection();
    const docs = await BenefitCardModel.find().lean();
    return docs.length ? docs.map((d) => stripMongoMeta(d) as BenefitCard) : INITIAL_BENEFITS;
  },

  async updateBenefitCards(benefits: BenefitCard[]): Promise<BenefitCard[]> {
    requireDatabaseConnection();
    await BenefitCardModel.deleteMany({});
    if (benefits.length > 0) await BenefitCardModel.insertMany(benefits);
    await auditService.addLog('Update Benefits', `Updated ${benefits.length} benefit cards`);
    return benefits;
  },

  async getFaqs(): Promise<FAQItem[]> {
    requireDatabaseConnection();
    const docs = await FaqModel.find().lean();
    return docs.length ? docs.map((d) => stripMongoMeta(d) as FAQItem) : INITIAL_FAQS;
  },

  async updateFaqs(faqs: FAQItem[]): Promise<FAQItem[]> {
    requireDatabaseConnection();
    await FaqModel.deleteMany({});
    if (faqs.length > 0) await FaqModel.insertMany(faqs);
    await auditService.addLog('Update FAQs', `Updated ${faqs.length} FAQ items`);
    return faqs;
  },

  async getPolicies(): Promise<LegalPolicies> {
    requireDatabaseConnection();
    const doc = await PolicyModel.findOne({ key: 'legal_policies' }).lean();
    if (doc) return stripMongoMeta(doc) as LegalPolicies;
    await PolicyModel.create({ key: 'legal_policies', ...INITIAL_POLICIES });
    return INITIAL_POLICIES;
  },

  async updatePolicies(updates: Partial<LegalPolicies>): Promise<LegalPolicies> {
    requireDatabaseConnection();
    const payload = {
      ...updates,
      lastUpdated: new Date().toISOString().split('T')[0],
    };

    const updated = await PolicyModel.findOneAndUpdate(
      { key: 'legal_policies' },
      { $set: payload },
      { new: true, upsert: true }
    ).lean();
    await auditService.addLog('Update Policies', 'Updated legal and renewal policies');
    return stripMongoMeta(updated!) as LegalPolicies;
  },

  async getReviews(onlyApproved = true): Promise<CustomerReview[]> {
    requireDatabaseConnection();
    const filter = onlyApproved ? { isApproved: true } : {};
    const docs = await ReviewModel.find(filter).sort({ createdAt: -1, reviewDate: -1 }).lean();
    return docs.map((d) => stripMongoMeta(d) as CustomerReview);
  },

  async submitReview(
    input: Omit<CustomerReview, 'id' | 'reviewDate' | 'isApproved' | 'isFeatured'>
  ): Promise<CustomerReview> {
    requireDatabaseConnection();
    const newReview: CustomerReview = {
      ...input,
      rating: Math.min(5, Math.max(1, Number(input.rating))),
      id: `rev-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      reviewDate: new Date().toISOString().split('T')[0],
      isApproved: false,
      isFeatured: false,
    };

    await ReviewModel.create(newReview);
    return newReview;
  },

  async updateReview(id: string, updates: Partial<CustomerReview>): Promise<CustomerReview | null> {
    requireDatabaseConnection();
    const updated = await ReviewModel.findOneAndUpdate({ id }, { $set: updates }, { new: true }).lean();
    return updated ? (stripMongoMeta(updated) as CustomerReview) : null;
  },

  async deleteReview(id: string): Promise<boolean> {
    requireDatabaseConnection();
    const res = await ReviewModel.deleteOne({ id });
    return res.deletedCount > 0;
  },

  async addInquiry(input: Omit<ContactMessage, 'id' | 'createdAt' | 'isRead'>): Promise<ContactMessage> {
    requireDatabaseConnection();
    const now = new Date().toISOString();
    const newMsg: ContactMessage = {
      ...input,
      id: `inq-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      createdAt: now,
      updatedAt: now,
      isRead: false,
      status: 'New',
      replies: [],
    };

    await InquiryModel.create(newMsg);
    return newMsg;
  },

  async getInquiries(): Promise<ContactMessage[]> {
    requireDatabaseConnection();
    const docs = await InquiryModel.find().sort({ createdAt: -1 }).lean();
    return docs.map((d) => {
      const item = stripMongoMeta(d) as ContactMessage;
      return {
        ...item,
        status: item.status || (item.isRead ? 'Replied' : 'New'),
        replies: Array.isArray(item.replies) ? item.replies : [],
      };
    });
  },

  async markInquiryRead(id: string): Promise<boolean> {
    requireDatabaseConnection();
    const res = await InquiryModel.updateOne(
      { id },
      { $set: { isRead: true, updatedAt: new Date().toISOString() } }
    );
    return res.matchedCount > 0;
  },

  async updateInquiryStatus(id: string, status: InquiryStatus): Promise<ContactMessage> {
    requireDatabaseConnection();
    const now = new Date().toISOString();
    const isRead = status !== 'New';
    const updated = await InquiryModel.findOneAndUpdate(
      { id },
      { $set: { status, isRead, updatedAt: now } },
      { new: true }
    ).lean();
    if (!updated) throw new ApiError(404, 'Inquiry not found');
    await auditService.addLog('Update Inquiry Status', `Updated inquiry ${id} status to "${status}"`, 'Admin');
    return {
      ...(stripMongoMeta(updated) as ContactMessage),
      status: updated.status || status,
      replies: updated.replies || [],
    };
  },

  async replyToInquiry(
    id: string,
    payload: { subject: string; message: string; adminUser?: string; status?: InquiryStatus }
  ): Promise<{
    inquiry: ContactMessage;
    sendResult: Awaited<ReturnType<typeof emailService.sendBrandedEmail>>;
  }> {
    requireDatabaseConnection();
    const existing = await InquiryModel.findOne({ id }).lean();
    if (!existing) throw new ApiError(404, 'Inquiry not found');

    const settings = await this.getSettings();
    const cleanSubject = payload.subject.trim();
    const cleanMessage = payload.message.trim();
    const adminName = payload.adminUser || 'Zeek Softwares Support';
    const now = new Date().toISOString();

    const bodyHtml = `
      <div style="white-space:pre-wrap;font-size:15px;line-height:1.65;color:#1E293B;">${escapeHtml(
        cleanMessage
      )}</div>
      <div style="margin-top:20px;padding:14px;border-radius:10px;background:#F8FAFC;border:1px solid #E2E8F0;font-size:12px;color:#475569;">
        <div style="font-weight:700;color:#061B45;margin-bottom:4px;">In response to your enquiry:</div>
        <div style="margin-bottom:4px;"><strong>Subject:</strong> ${escapeHtml(existing.subject)}</div>
        <div style="white-space:pre-wrap;color:#64748B;">${escapeHtml(existing.message)}</div>
      </div>
    `;

    const sendResult = await emailService.sendBrandedEmail({
      to: existing.email,
      replyTo: settings.supportEmail,
      recipientName: existing.fullName,
      subject: cleanSubject,
      greeting: `Hello ${existing.fullName || 'there'},`,
      bodyHtml,
      isPromotional: false,
      settings,
      includeDiagnostics: false,
    });

    const replyRecord: InquiryReply = {
      id: `rep-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      toEmail: existing.email,
      subject: cleanSubject,
      message: cleanMessage,
      sentBy: adminName,
      sentAt: now,
      status: sendResult.sent ? 'sent' : 'failed',
      messageId: sendResult.messageId,
      error: sendResult.error,
    };

    const nextStatus: InquiryStatus =
      payload.status || (sendResult.sent ? 'Replied' : existing.status || 'New');

    const updated = await InquiryModel.findOneAndUpdate(
      { id },
      {
        $push: { replies: replyRecord },
        $set: {
          isRead: true,
          status: nextStatus,
          updatedAt: now,
        },
      },
      { new: true }
    ).lean();

    await auditService.addLog(
      sendResult.sent ? 'Inquiry Reply Sent' : 'Inquiry Reply Failed',
      `Reply to ${existing.email} (Inquiry ${id}) | Subject: "${cleanSubject}" | Status: ${nextStatus}${
        sendResult.error ? ` | Error: ${sendResult.error}` : ''
      }`,
      adminName
    );

    return {
      inquiry: {
        ...(stripMongoMeta(updated!) as ContactMessage),
        status: updated!.status || nextStatus,
        replies: updated!.replies || [],
      },
      sendResult,
    };
  },

  async getCategories(): Promise<string[]> {
    requireDatabaseConnection();
    const docs = await CategoryModel.find().sort({ displayOrder: 1 }).lean();
    return docs.length ? docs.map((d) => d.name) : INITIAL_CATEGORIES;
  },

  async getBootstrapData() {
    requireDatabaseConnection();
    const [allProducts, categories, heroSlides, benefitCards, reviews, settings, faqs, policies] =
      await Promise.all([
        productService.getProducts({ onlyAvailable: false }),
        this.getCategories(),
        this.getHeroSlides(true),
        this.getBenefitCards(),
        this.getReviews(true),
        this.getSettings(),
        this.getFaqs(),
        this.getPolicies(),
      ]);

    return {
      products: allProducts.filter((p) => p.isAvailable),
      allProducts,
      categories,
      heroSlides,
      benefitCards,
      reviews,
      settings,
      faqs,
      policies,
    };
  },
};
