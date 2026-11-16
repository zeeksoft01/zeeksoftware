import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { connectToDatabase, getDb, ensureMongoIndexes, closeMongoConnection, getMongoUri } from '../server/mongodb';
import { ProductRepository } from '../server/repositories/product.repository';
import { OrderRepository } from '../server/repositories/order.repository';
import { AffiliateRepository } from '../server/repositories/affiliate.repository';
import { ContentRepository } from '../server/repositories/content.repository';

dotenv.config();

/**
 * Migration Script: Migrate data from local JSON database into MongoDB Atlas
 * 
 * Usage:
 *   npx tsx scripts/migrate-to-mongodb.ts
 */
async function runMigration() {
  console.log('====================================================');
  console.log('       ZEEK SOFTWARES MONGODB MIGRATION RUNNER      ');
  console.log('====================================================');

  const uri = getMongoUri();
  if (!uri) {
    console.error('\n[Error] MONGODB_URI is not set in environment or .env file.');
    console.error('Please configure your connection string:');
    console.error('  MONGODB_URI=mongodb+srv://USERNAME:PASSWORD@cluster.mongodb.net/DATABASE_NAME?retryWrites=true&w=majority\n');
    process.exit(1);
  }

  const dataFile = path.resolve(process.cwd(), 'data/zeek_database.json');
  if (!fs.existsSync(dataFile)) {
    console.error(`\n[Error] Database file not found at: ${dataFile}`);
    process.exit(1);
  }

  console.log(`[1/4] Reading local data from ${dataFile}...`);
  const raw = fs.readFileSync(dataFile, 'utf-8');
  const data = JSON.parse(raw);

  console.log('[2/4] Connecting to MongoDB...');
  const db = await connectToDatabase();
  if (!db) {
    console.error('[Error] Could not establish MongoDB connection.');
    process.exit(1);
  }

  console.log('[3/4] Ensuring MongoDB indexes...');
  await ensureMongoIndexes(db);

  const productRepo = new ProductRepository(getDb);
  const orderRepo = new OrderRepository(getDb);
  const affiliateRepo = new AffiliateRepository(getDb);
  const contentRepo = new ContentRepository(getDb);

  console.log('[4/4] Migrating collections to MongoDB (idempotent upsert)...');

  const summary = {
    products: 0,
    orders: 0,
    heroSlides: 0,
    benefitCards: 0,
    reviews: 0,
    faqs: 0,
    affiliates: 0,
    commissions: 0,
    withdrawals: 0,
    ledger: 0,
    inquiries: 0,
    auditLogs: 0,
  };

  // 1. Products
  if (Array.isArray(data.products)) {
    await productRepo.seedMany(data.products);
    summary.products = data.products.length;
  }

  // 2. Orders
  if (Array.isArray(data.orders)) {
    await orderRepo.seedMany(data.orders);
    summary.orders = data.orders.length;
  }

  // 3. Content (Slides, Settings, Benefits, Reviews, FAQs, Policies)
  await contentRepo.seedAll({
    heroSlides: data.heroSlides,
    settings: data.settings,
    benefitCards: data.benefitCards,
    reviews: data.reviews,
    faqs: data.faqs,
    policies: data.policies,
  });
  summary.heroSlides = data.heroSlides?.length || 0;
  summary.benefitCards = data.benefitCards?.length || 0;
  summary.reviews = data.reviews?.length || 0;
  summary.faqs = data.faqs?.length || 0;

  // 4. Affiliates & Financial Ledger
  await affiliateRepo.seedAll({
    affiliates: data.affiliates,
    referralClicks: data.referralClicks,
    affiliateCommissions: data.affiliateCommissions,
    affiliateWithdrawals: data.affiliateWithdrawals,
    affiliateLedger: data.affiliateLedger,
  });
  summary.affiliates = data.affiliates?.length || 0;
  summary.commissions = data.affiliateCommissions?.length || 0;
  summary.withdrawals = data.affiliateWithdrawals?.length || 0;
  summary.ledger = data.affiliateLedger?.length || 0;

  // 5. Inquiries
  if (Array.isArray(data.inquiries)) {
    for (const inq of data.inquiries) {
      await db.collection('inquiries').updateOne({ id: inq.id }, { $setOnInsert: inq }, { upsert: true });
    }
    summary.inquiries = data.inquiries.length;
  }

  // 6. Audit Logs
  if (Array.isArray(data.auditLogs)) {
    for (const log of data.auditLogs) {
      await db.collection('audit_logs').updateOne({ id: log.id }, { $setOnInsert: log }, { upsert: true });
    }
    summary.auditLogs = data.auditLogs.length;
  }

  console.log('\n====================================================');
  console.log('           MIGRATION COMPLETED SUCCESSFULLY!        ');
  console.log('====================================================');
  console.table(summary);

  await closeMongoConnection();
  console.log('Connection closed. You are ready to run in full MongoDB mode!\n');
}

runMigration().catch((err) => {
  console.error('\n[Migration Failed]', err);
  process.exit(1);
});
