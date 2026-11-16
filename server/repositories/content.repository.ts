import { Db } from 'mongodb';
import {
  HeroSlide,
  SiteSettings,
  BenefitCard,
  CustomerReview,
  FAQItem,
  LegalPolicies,
  ContactMessage,
  AuditLog,
} from '../../src/types';

export class ContentRepository {
  constructor(private getDb: () => Db | null) {}

  private get slidesCol() {
    const db = this.getDb();
    if (!db) throw new Error('Database not connected');
    return db.collection<HeroSlide>('hero_slides');
  }

  private get settingsCol() {
    const db = this.getDb();
    if (!db) throw new Error('Database not connected');
    return db.collection<SiteSettings & { _id: string }>('settings');
  }

  private get benefitsCol() {
    const db = this.getDb();
    if (!db) throw new Error('Database not connected');
    return db.collection<BenefitCard>('benefit_cards');
  }

  private get reviewsCol() {
    const db = this.getDb();
    if (!db) throw new Error('Database not connected');
    return db.collection<CustomerReview>('reviews');
  }

  private get faqsCol() {
    const db = this.getDb();
    if (!db) throw new Error('Database not connected');
    return db.collection<FAQItem>('faqs');
  }

  private get policiesCol() {
    const db = this.getDb();
    if (!db) throw new Error('Database not connected');
    return db.collection<LegalPolicies & { _id: string }>('policies');
  }

  private get inquiriesCol() {
    const db = this.getDb();
    if (!db) throw new Error('Database not connected');
    return db.collection<ContactMessage>('inquiries');
  }

  private get auditLogsCol() {
    const db = this.getDb();
    if (!db) throw new Error('Database not connected');
    return db.collection<AuditLog>('audit_logs');
  }

  // --- Hero Slides ---
  async getHeroSlides(onlyActive = false): Promise<HeroSlide[]> {
    const query = onlyActive ? { isActive: true } : {};
    return this.slidesCol.find(query).sort({ displayOrder: 1 }).toArray();
  }

  async saveHeroSlides(slides: HeroSlide[]): Promise<HeroSlide[]> {
    await this.slidesCol.deleteMany({});
    if (slides.length > 0) {
      await this.slidesCol.insertMany(slides);
    }
    return slides;
  }

  // --- Site Settings ---
  async getSettings(): Promise<SiteSettings | null> {
    const doc = await this.settingsCol.findOne({ _id: 'global_settings' });
    if (!doc) return null;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { _id, ...settings } = doc;
    return settings as SiteSettings;
  }

  async updateSettings(updates: Partial<SiteSettings>): Promise<SiteSettings> {
    const res = await this.settingsCol.findOneAndUpdate(
      { _id: 'global_settings' },
      { $set: updates },
      { upsert: true, returnDocument: 'after' }
    );
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { _id, ...settings } = res!;
    return settings as SiteSettings;
  }

  // --- Benefit Cards ---
  async getBenefitCards(): Promise<BenefitCard[]> {
    return this.benefitsCol.find({}).sort({ displayOrder: 1 }).toArray();
  }

  async saveBenefitCards(cards: BenefitCard[]): Promise<BenefitCard[]> {
    await this.benefitsCol.deleteMany({});
    if (cards.length > 0) {
      await this.benefitsCol.insertMany(cards);
    }
    return cards;
  }

  // --- Reviews ---
  async getReviews(onlyApproved = true): Promise<CustomerReview[]> {
    const query = onlyApproved ? { isApproved: true } : {};
    return this.reviewsCol.find(query).sort({ rating: -1 }).toArray();
  }

  async addReview(review: CustomerReview): Promise<CustomerReview> {
    await this.reviewsCol.insertOne(review);
    return review;
  }

  async updateReview(id: string, updates: Partial<CustomerReview>): Promise<CustomerReview | null> {
    const res = await this.reviewsCol.findOneAndUpdate(
      { id },
      { $set: updates },
      { returnDocument: 'after' }
    );
    return res || null;
  }

  async deleteReview(id: string): Promise<boolean> {
    const res = await this.reviewsCol.deleteOne({ id });
    return res.deletedCount === 1;
  }

  // --- FAQs ---
  async getFaqs(): Promise<FAQItem[]> {
    return this.faqsCol.find({}).sort({ displayOrder: 1 }).toArray();
  }

  async saveFaqs(faqs: FAQItem[]): Promise<FAQItem[]> {
    await this.faqsCol.deleteMany({});
    if (faqs.length > 0) {
      await this.faqsCol.insertMany(faqs);
    }
    return faqs;
  }

  // --- Policies ---
  async getPolicies(): Promise<LegalPolicies | null> {
    const doc = await this.policiesCol.findOne({ _id: 'global_policies' });
    if (!doc) return null;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { _id, ...policies } = doc;
    return policies as LegalPolicies;
  }

  async updatePolicies(updates: Partial<LegalPolicies>): Promise<LegalPolicies> {
    const res = await this.policiesCol.findOneAndUpdate(
      { _id: 'global_policies' },
      {
        $set: {
          ...updates,
          lastUpdated: new Date().toISOString().split('T')[0],
        },
      },
      { upsert: true, returnDocument: 'after' }
    );
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { _id, ...policies } = res!;
    return policies as LegalPolicies;
  }

  // --- Inquiries ---
  async getInquiries(): Promise<ContactMessage[]> {
    return this.inquiriesCol.find({}).sort({ createdAt: -1 }).toArray();
  }

  async addInquiry(msg: ContactMessage): Promise<ContactMessage> {
    await this.inquiriesCol.insertOne(msg);
    return msg;
  }

  async markInquiryRead(id: string): Promise<boolean> {
    const res = await this.inquiriesCol.updateOne({ id }, { $set: { isRead: true } });
    return res.modifiedCount === 1;
  }

  // --- Audit Logs ---
  async getAuditLogs(limit = 100): Promise<AuditLog[]> {
    return this.auditLogsCol.find({}).sort({ timestamp: -1 }).limit(limit).toArray();
  }

  async addAuditLog(log: AuditLog): Promise<void> {
    await this.auditLogsCol.insertOne(log);
    // Keep collection bounded to latest 500 records
    const count = await this.auditLogsCol.countDocuments();
    if (count > 500) {
      const oldest = await this.auditLogsCol
        .find({})
        .sort({ timestamp: 1 })
        .limit(count - 500)
        .toArray();
      const ids = oldest.map((d) => d.id);
      await this.auditLogsCol.deleteMany({ id: { $in: ids } });
    }
  }

  async seedAll(data: {
    heroSlides?: HeroSlide[];
    settings?: SiteSettings;
    benefitCards?: BenefitCard[];
    reviews?: CustomerReview[];
    faqs?: FAQItem[];
    policies?: LegalPolicies;
  }): Promise<void> {
    if (data.heroSlides && (await this.slidesCol.countDocuments()) === 0) {
      await this.slidesCol.insertMany(data.heroSlides);
    }
    if (data.settings) {
      await this.settingsCol.updateOne(
        { _id: 'global_settings' },
        { $setOnInsert: { _id: 'global_settings', ...data.settings } },
        { upsert: true }
      );
    }
    if (data.benefitCards && (await this.benefitsCol.countDocuments()) === 0) {
      await this.benefitsCol.insertMany(data.benefitCards);
    }
    if (data.reviews && (await this.reviewsCol.countDocuments()) === 0) {
      await this.reviewsCol.insertMany(data.reviews);
    }
    if (data.faqs && (await this.faqsCol.countDocuments()) === 0) {
      await this.faqsCol.insertMany(data.faqs);
    }
    if (data.policies) {
      await this.policiesCol.updateOne(
        { _id: 'global_policies' },
        { $setOnInsert: { _id: 'global_policies', ...data.policies } },
        { upsert: true }
      );
    }
  }
}
