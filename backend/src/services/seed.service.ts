import {
  ProductModel,
  CategoryModel,
  HeroSlideModel,
  BenefitCardModel,
  ReviewModel,
  FaqModel,
  PolicyModel,
  SiteSettingsModel,
  AuditLogModel,
  OrderModel,
  InquiryModel,
  AffiliateModel,
  ReferralClickModel,
  AffiliateCommissionModel,
  AffiliateWithdrawalModel,
  AffiliateLedgerModel,
  ReferralAttributionModel,
  UserModel,
  EmailContactModel,
  EmailCampaignModel,
  EmailSendLogModel,
  DailyAutomationConfigModel,
  DigitalAssetModel,
  ProductDeliveryRecordModel,
} from '../models';
import {
  INITIAL_PRODUCTS,
  INITIAL_CATEGORIES,
  INITIAL_HERO_SLIDES,
  INITIAL_BENEFITS,
  INITIAL_REVIEWS,
  INITIAL_FAQS,
  INITIAL_POLICIES,
  DEFAULT_AFFILIATE_GUIDE,
  PRODUCT_LOGO_BY_ID,
  getInitialSettings,
  getDefaultDailyAutomationConfig,
} from '../utils/seedData';
import { isDatabaseConnected } from '../config/database';
import { userService } from './user.service';
import { emailContactService } from './emailContact.service';

const BEP20_TARGET_ADDRESS = '0xde96acbcaedbb4a4d101aa3d6fbaa463cde15fe3';
const LEGACY_BEP20_PLACEHOLDER = '0x71C0F4A92b678e2D731a5477810A38e8Db1F6517';

export const seedDatabaseIfEmpty = async (): Promise<void> => {
  if (!isDatabaseConnected()) return;

  // Ensure all Mongoose collections exist in MongoDB (visible immediately in Compass)
  await Promise.all([
    ProductModel.createCollection().catch(() => {}),
    CategoryModel.createCollection().catch(() => {}),
    HeroSlideModel.createCollection().catch(() => {}),
    BenefitCardModel.createCollection().catch(() => {}),
    ReviewModel.createCollection().catch(() => {}),
    FaqModel.createCollection().catch(() => {}),
    PolicyModel.createCollection().catch(() => {}),
    SiteSettingsModel.createCollection().catch(() => {}),
    AuditLogModel.createCollection().catch(() => {}),
    OrderModel.createCollection().catch(() => {}),
    InquiryModel.createCollection().catch(() => {}),
    UserModel.createCollection().catch(() => {}),
    AffiliateModel.createCollection().catch(() => {}),
    ReferralClickModel.createCollection().catch(() => {}),
    ReferralAttributionModel.createCollection().catch(() => {}),
    AffiliateCommissionModel.createCollection().catch(() => {}),
    AffiliateWithdrawalModel.createCollection().catch(() => {}),
    AffiliateLedgerModel.createCollection().catch(() => {}),
    EmailContactModel.createCollection().catch(() => {}),
    EmailCampaignModel.createCollection().catch(() => {}),
    EmailSendLogModel.createCollection().catch(() => {}),
    DailyAutomationConfigModel.createCollection().catch(() => {}),
    DigitalAssetModel.createCollection().catch(() => {}),
    ProductDeliveryRecordModel.createCollection().catch(() => {}),
  ]);

  await userService.syncLegacyUsersToUnifiedCollection();

  const dailyExists = await DailyAutomationConfigModel.exists({ key: 'daily_automation' });
  if (!dailyExists) {
    await DailyAutomationConfigModel.create(getDefaultDailyAutomationConfig()).catch(() => {});
  }

  await emailContactService.syncAllExistingRecords().catch((err) => {
    console.warn('[Seed] Non-fatal email contact sync warning:', err);
  });

  const [
    productCount,
    categoryCount,
    slideCount,
    benefitCount,
    reviewCount,
    faqCount,
    policyExists,
    settingsExists,
    logCount,
  ] = await Promise.all([
    ProductModel.countDocuments(),
    CategoryModel.countDocuments(),
    HeroSlideModel.countDocuments(),
    BenefitCardModel.countDocuments(),
    ReviewModel.countDocuments(),
    FaqModel.countDocuments(),
    PolicyModel.exists({ key: 'legal_policies' }),
    SiteSettingsModel.exists({ key: 'site_settings' }),
    AuditLogModel.countDocuments(),
  ]);

  if (productCount === 0) {
    await ProductModel.insertMany(INITIAL_PRODUCTS);
    console.log(`[Mongoose Seed] Seeded ${INITIAL_PRODUCTS.length} products.`);
  } else {
    // Replace generic Unsplash placeholder images with crisp original brand logos (preserves Admin-uploaded Cloudinary URLs)
    const logoEntries = Object.entries(PRODUCT_LOGO_BY_ID);
    const bulkLogoUpdates = logoEntries.map(([id, logoPath]) => ({
      updateOne: {
        filter: { id, image: { $regex: /^https:\/\/images\.unsplash\.com\//i } },
        update: { $set: { image: logoPath } },
      },
    }));
    if (bulkLogoUpdates.length > 0) {
      await ProductModel.bulkWrite(bulkLogoUpdates);
    }
  }

  if (categoryCount === 0) {
    await CategoryModel.insertMany(
      INITIAL_CATEGORIES.map((name, idx) => ({
        id: `cat-${idx + 1}`,
        name,
        displayOrder: idx + 1,
      }))
    );
    console.log(`[Mongoose Seed] Seeded ${INITIAL_CATEGORIES.length} categories.`);
  }

  if (slideCount === 0) {
    await HeroSlideModel.insertMany(INITIAL_HERO_SLIDES);
    console.log(`[Mongoose Seed] Seeded ${INITIAL_HERO_SLIDES.length} hero slides.`);
  }

  if (benefitCount === 0) {
    await BenefitCardModel.insertMany(INITIAL_BENEFITS);
  }

  if (reviewCount === 0) {
    await ReviewModel.insertMany(INITIAL_REVIEWS);
  }

  if (faqCount === 0) {
    await FaqModel.insertMany(INITIAL_FAQS);
  } else {
    // Ensure new activation FAQ exists idempotently
    const activationFaqExists = await FaqModel.exists({
      question: { $regex: /how long does the activation take/i },
    });
    if (!activationFaqExists) {
      await FaqModel.create({
        id: 'faq-10',
        question: 'How long does the activation take?',
        answer: 'Activation is instant as soon as your payment is confirmed.',
      });
    }
  }

  if (!policyExists) {
    await PolicyModel.create({ key: 'legal_policies', ...INITIAL_POLICIES });
  } else {
    // Scrub legacy 30-day attribution phrasing if still untouched
    const existingPolicy = await PolicyModel.findOne({ key: 'legal_policies' }).lean();
    if (existingPolicy?.affiliateTerms?.includes('30-day attribution window')) {
      await PolicyModel.updateOne(
        { key: 'legal_policies' },
        {
          $set: {
            affiliateTerms: existingPolicy.affiliateTerms.replace(
              /within the 30-day attribution window/gi,
              ''
            ).replace(/\s+\./g, '.'),
          },
        }
      );
    }
  }

  if (!settingsExists) {
    await SiteSettingsModel.create({ key: 'site_settings', ...getInitialSettings() });
  } else {
    const existingSettings = await SiteSettingsModel.findOne({ key: 'site_settings' }).lean();
    if (existingSettings) {
      const settingsUpdates: Record<string, unknown> = {};

      // Ensure USDT BEP20 address is configured cleanly without touching Admin custom TRC20
      const networks = Array.isArray(existingSettings.usdtNetworks)
        ? existingSettings.usdtNetworks.map((n) => ({ ...n }))
        : [];
      const bepIndex = networks.findIndex((n) => /bep20|bsc/i.test(n.network));
      if (bepIndex === -1) {
        networks.push({ network: 'USDT (BEP20 / BSC)', address: BEP20_TARGET_ADDRESS });
        settingsUpdates.usdtNetworks = networks;
      } else if (
        !networks[bepIndex].address ||
        networks[bepIndex].address.trim() === LEGACY_BEP20_PLACEHOLDER
      ) {
        networks[bepIndex].address = BEP20_TARGET_ADDRESS;
        settingsUpdates.usdtNetworks = networks;
      }

      // Scrub confidential first-purchase policy text from public guide-step-6 if still default
      if (existingSettings.affiliateGuide?.sections) {
        let guideChanged = false;
        const nextSections = existingSettings.affiliateGuide.sections.map((sec) => {
          if (
            sec.id === 'guide-step-6' &&
            (/first qualifying purchase only/i.test(sec.content || '') ||
              /Recurring Commissions are OFF/i.test(sec.content || '') ||
              /How Recurring Commissions Work/i.test(sec.title || ''))
          ) {
            guideChanged = true;
            const replacement = DEFAULT_AFFILIATE_GUIDE.sections.find((s) => s.id === 'guide-step-6');
            return replacement ? { ...replacement } : sec;
          }
          return sec;
        });
        if (guideChanged) {
          settingsUpdates['affiliateGuide.sections'] = nextSections;
        }
        if (
          existingSettings.affiliateGuide.description &&
          /recurring Naira commissions/i.test(existingSettings.affiliateGuide.description)
        ) {
          settingsUpdates['affiliateGuide.description'] = DEFAULT_AFFILIATE_GUIDE.description;
        }
      }

      // One-time migration: remove legacy seeded 10% default commission once
      const migrationDone = await AuditLogModel.exists({ id: 'log-migration-2026-11-affiliate-v2' });
      if (!migrationDone) {
        if (existingSettings.defaultCommissionRate === 10) {
          settingsUpdates.defaultCommissionRate = 0;
        }
        await AuditLogModel.create({
          id: 'log-migration-2026-11-affiliate-v2',
          action: 'Platform Upgrade Migration',
          details:
            'Applied USDT BEP20 wallet update, removed default 10% base commission, and scrubbed confidential/30-day public affiliate copy.',
          adminUser: 'System',
          timestamp: new Date().toISOString(),
        }).catch(() => {});
      }

      if (Object.keys(settingsUpdates).length > 0) {
        await SiteSettingsModel.updateOne({ key: 'site_settings' }, { $set: settingsUpdates });
      }
    }
  }

  if (logCount === 0) {
    await AuditLogModel.create({
      id: 'log-init',
      action: 'MongoDB Initialized',
      details: 'Auto-seeded initial Zeek Softwares catalog, hero slides, and platform settings.',
      adminUser: 'System',
      timestamp: new Date().toISOString(),
    });
  }
};
