import { MongoClient, Db, MongoClientOptions } from 'mongodb';

/**
 * MongoDB Connection & Lifecycle Module for Zeek Softwares
 * 
 * Features:
 * - Singleton connection pooling with reconnect support
 * - Safe hot-reload caching in development
 * - Server-only execution
 * - Automated index creation and health ping
 * - Graceful shutdown handling
 */

interface MongoConnectionState {
  client: MongoClient | null;
  db: Db | null;
  isConnected: boolean;
  connectingPromise: Promise<Db> | null;
  lastError: string | null;
}

// Global cache for hot-reload in development
declare global {
  // eslint-disable-next-line no-var
  var __mongoConnection: MongoConnectionState | undefined;
}

const state: MongoConnectionState = global.__mongoConnection || {
  client: null,
  db: null,
  isConnected: false,
  connectingPromise: null,
  lastError: null,
};

if (process.env.NODE_ENV !== 'production') {
  global.__mongoConnection = state;
}

/**
 * Get MongoDB connection URI from environment
 */
export function getMongoUri(): string | null {
  const uri = process.env.MONGODB_URI;
  if (!uri || !uri.trim()) {
    return null;
  }
  return uri.trim();
}

/**
 * Get Database Name from environment or URI
 */
export function getDbName(): string {
  if (process.env.MONGODB_DB_NAME && process.env.MONGODB_DB_NAME.trim()) {
    return process.env.MONGODB_DB_NAME.trim();
  }
  return 'zeek_softwares';
}

/**
 * Connect to MongoDB with robust connection pooling
 */
export async function connectToDatabase(): Promise<Db | null> {
  const uri = getMongoUri();
  if (!uri) {
    state.isConnected = false;
    state.lastError = 'MONGODB_URI not configured';
    return null;
  }

  // If already connected, reuse existing Db instance
  if (state.client && state.db && state.isConnected) {
    return state.db;
  }

  // Prevent duplicate concurrent connection attempts
  if (state.connectingPromise) {
    return state.connectingPromise;
  }

  state.connectingPromise = (async () => {
    try {
      const dbName = getDbName();
      console.log(`[MongoDB] Connecting to cluster for database: "${dbName}"...`);

      const options: MongoClientOptions = {
        maxPoolSize: 20,
        minPoolSize: 2,
        maxIdleTimeMS: 30000,
        serverSelectionTimeoutMS: 8000,
        connectTimeoutMS: 10000,
        retryWrites: true,
      };

      const client = new MongoClient(uri, options);
      await client.connect();

      // Quick ping test
      const db = client.db(dbName);
      await db.command({ ping: 1 });

      state.client = client;
      state.db = db;
      state.isConnected = true;
      state.lastError = null;

      console.log(`[MongoDB] Successfully connected to database: "${dbName}"`);

      // Ensure indexes in background
      ensureMongoIndexes(db).catch((err) => {
        console.error('[MongoDB Index Warning] Failed to build some indexes:', err.message);
      });

      return db;
    } catch (err: unknown) {
      state.isConnected = false;
      const message = err instanceof Error ? err.message : String(err);
      state.lastError = message;
      console.error('[MongoDB Connection Error] Failed to connect to MongoDB:', message);
      throw err;
    } finally {
      state.connectingPromise = null;
    }
  })();

  return state.connectingPromise;
}

/**
 * Ensure all collection indexes are created programmatically
 */
export async function ensureMongoIndexes(db: Db): Promise<void> {
  try {
    // 1. Products: unique id, category lookup, availability
    await db.collection('products').createIndex({ id: 1 }, { unique: true });
    await db.collection('products').createIndex({ category: 1 });
    await db.collection('products').createIndex({ isAvailable: 1 });
    await db.collection('products').createIndex({ displayOrder: 1 });

    // 2. Orders: unique id, customer queries, payment ref
    await db.collection('orders').createIndex({ id: 1 }, { unique: true });
    await db.collection('orders').createIndex({ customerEmail: 1 });
    await db.collection('orders').createIndex({ customerWhatsApp: 1 });
    await db.collection('orders').createIndex({ paymentReference: 1 }, { sparse: true });
    await db.collection('orders').createIndex({ paymentStatus: 1 });
    await db.collection('orders').createIndex({ createdAt: -1 });

    // 3. Affiliates: unique id, unique email, unique referralCode
    await db.collection('affiliates').createIndex({ id: 1 }, { unique: true });
    await db.collection('affiliates').createIndex({ email: 1 }, { unique: true });
    await db.collection('affiliates').createIndex({ referralCode: 1 }, { unique: true });
    await db.collection('affiliates').createIndex({ status: 1 });

    // 4. Referral Clicks
    await db.collection('referral_clicks').createIndex({ affiliateId: 1 });
    await db.collection('referral_clicks').createIndex({ referralCode: 1 });
    await db.collection('referral_clicks').createIndex({ timestamp: -1 });

    // 5. Affiliate Commissions
    await db.collection('affiliate_commissions').createIndex({ id: 1 }, { unique: true });
    await db.collection('affiliate_commissions').createIndex({ affiliateId: 1 });
    await db.collection('affiliate_commissions').createIndex({ orderId: 1 });
    await db.collection('affiliate_commissions').createIndex({ createdAt: -1 });

    // 6. Affiliate Withdrawals
    await db.collection('affiliate_withdrawals').createIndex({ id: 1 }, { unique: true });
    await db.collection('affiliate_withdrawals').createIndex({ affiliateId: 1 });
    await db.collection('affiliate_withdrawals').createIndex({ status: 1 });

    // 7. Affiliate Ledger (Immutable Financial Transaction Log)
    await db.collection('affiliate_ledger').createIndex({ id: 1 }, { unique: true });
    await db.collection('affiliate_ledger').createIndex({ affiliateId: 1 });
    await db.collection('affiliate_ledger').createIndex({ createdAt: -1 });

    // 8. Reviews
    await db.collection('reviews').createIndex({ id: 1 }, { unique: true });
    await db.collection('reviews').createIndex({ isApproved: 1 });

    // 9. Hero Slides
    await db.collection('hero_slides').createIndex({ id: 1 }, { unique: true });
    await db.collection('hero_slides').createIndex({ isActive: 1 });
    await db.collection('hero_slides').createIndex({ displayOrder: 1 });

    // 10. Inquiries
    await db.collection('inquiries').createIndex({ id: 1 }, { unique: true });
    await db.collection('inquiries').createIndex({ createdAt: -1 });

    // 11. Audit Logs
    await db.collection('audit_logs').createIndex({ id: 1 }, { unique: true });
    await db.collection('audit_logs').createIndex({ timestamp: -1 });

    console.log('[MongoDB Indexes] Successfully verified and initialized all collection indexes.');
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn('[MongoDB Indexes] Index check encountered non-fatal notice:', msg);
  }
}

/**
 * Return current Db or null
 */
export function getDb(): Db | null {
  return state.db;
}

/**
 * Return MongoClient instance or null
 */
export function getMongoClient(): MongoClient | null {
  return state.client;
}

/**
 * Check if MongoDB is connected and active
 */
export function isMongoConnected(): boolean {
  return state.isConnected && state.db !== null;
}

/**
 * Health check ping
 */
export async function pingMongo(): Promise<{ ok: boolean; latencyMs?: number; error?: string }> {
  if (!state.client || !state.db || !state.isConnected) {
    return { ok: false, error: state.lastError || 'Not connected' };
  }
  const start = Date.now();
  try {
    await state.db.command({ ping: 1 });
    return { ok: true, latencyMs: Date.now() - start };
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Graceful shutdown
 */
export async function closeMongoConnection(): Promise<void> {
  if (state.client) {
    console.log('[MongoDB] Closing database connection pool...');
    await state.client.close();
    state.client = null;
    state.db = null;
    state.isConnected = false;
  }
}

// Register process exit listeners
process.on('SIGINT', async () => {
  await closeMongoConnection();
});
process.on('SIGTERM', async () => {
  await closeMongoConnection();
});
