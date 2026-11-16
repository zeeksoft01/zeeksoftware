import mongoose from 'mongoose';
import { env } from './env';
import { ApiError } from '../utils/ApiError';

let connectionPromise: Promise<typeof mongoose | null> | null = null;
let listenersAttached = false;
let lastConnectionError: string | null = null;
let lastLoggedError: string | null = null;
let reconnectTimer: NodeJS.Timeout | null = null;

const sanitizeMongoError = (message: string): string => {
  return message.replace(/mongodb(?:\+srv)?:\/\/[^@\s]+@/gi, 'mongodb***://***@');
};

const formatHumanNotice = (sanitized: string): string => {
  if (/SSL alert number 80|tlsv1 alert internal error|whitelist/i.test(sanitized)) {
    return 'Atlas cluster rejected the connection (ensure Atlas Network Access allows 0.0.0.0/0 and the cluster is active).';
  }
  if (/ENOTFOUND|EAI_AGAIN/i.test(sanitized)) {
    return 'MongoDB host could not be resolved via DNS (check cluster hostname in MONGODB_URI).';
  }
  if (/Authentication failed|bad auth/i.test(sanitized)) {
    return 'MongoDB authentication failed (check username/password and URL-encode special characters).';
  }
  return 'MongoDB cluster is currently unreachable.';
};

export const isDatabaseConnected = (): boolean => {
  return mongoose.connection.readyState === 1;
};

export const waitForDatabaseReady = async (timeoutMs = 8000): Promise<boolean> => {
  if (isDatabaseConnected()) return true;
  if (!connectionPromise) return false;
  await Promise.race([
    connectionPromise.catch(() => null),
    new Promise((resolve) => setTimeout(resolve, timeoutMs)),
  ]);
  return isDatabaseConnected();
};

export const requireDatabaseConnection = (): void => {
  if (!isDatabaseConnected()) {
    throw new ApiError(
      503,
      'Database unavailable: MongoDB is not connected. Verify MONGODB_URI and Atlas Network Access.'
    );
  }
};

export const getMongoConnectionStatus = () => {
  const states: Record<number, string> = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };
  return {
    readyState: mongoose.connection.readyState,
    state: states[mongoose.connection.readyState] || 'unknown',
    uriConfigured: Boolean(env.mongodbUri),
    databaseName: mongoose.connection.name || env.mongodbDbName,
    lastError: lastConnectionError,
    hint: lastConnectionError ? formatHumanNotice(lastConnectionError) : null,
  };
};

export const pingDatabase = async (): Promise<{ ok: boolean; latencyMs?: number; error?: string }> => {
  if (!isDatabaseConnected() || !mongoose.connection.db) {
    return { ok: false, error: 'Mongoose is not connected' };
  }
  const start = Date.now();
  try {
    await mongoose.connection.db.admin().ping();
    return { ok: true, latencyMs: Date.now() - start };
  } catch (err: unknown) {
    return {
      ok: false,
      error: err instanceof Error ? sanitizeMongoError(err.message) : sanitizeMongoError(String(err)),
    };
  }
};

export const connectDatabase = async (onConnected?: () => Promise<void>): Promise<typeof mongoose | null> => {
  if (!env.mongodbUri) {
    console.warn('[Mongoose] MONGODB_URI is not set. Database operations require a valid MongoDB connection.');
    return null;
  }

  if (isDatabaseConnected()) {
    return mongoose;
  }

  if (connectionPromise) {
    return connectionPromise;
  }

  if (!listenersAttached) {
    listenersAttached = true;
    mongoose.connection.on('connected', () => {
      lastConnectionError = null;
      lastLoggedError = null;
      console.log(`[Mongoose] Connected to MongoDB database: "${mongoose.connection.name || env.mongodbDbName}"`);
    });
    mongoose.connection.on('error', (err) => {
      const sanitized = sanitizeMongoError(err.message);
      lastConnectionError = sanitized;
      const notice = formatHumanNotice(sanitized);
      if (lastLoggedError !== notice) {
        lastLoggedError = notice;
        console.log(`[Mongoose] ${notice}`);
      }
    });
    mongoose.connection.on('disconnected', () => {
      console.log('[Mongoose] Disconnected from MongoDB');
    });
  }

  const dbNameOption = env.explicitMongodbDbName || (!env.uriHasDbName ? env.mongodbDbName : undefined);

  connectionPromise = mongoose
    .connect(env.mongodbUri, {
      dbName: dbNameOption,
      maxPoolSize: 10,
      minPoolSize: 2,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      autoIndex: true,
    })
    .then(async (conn) => {
      lastConnectionError = null;
      lastLoggedError = null;
      if (onConnected) {
        await onConnected();
      }
      return conn;
    })
    .catch((err: unknown) => {
      const msg = err instanceof Error ? err.message : String(err);
      const sanitized = sanitizeMongoError(msg);
      lastConnectionError = sanitized;
      const notice = formatHumanNotice(sanitized);
      if (lastLoggedError !== notice) {
        lastLoggedError = notice;
        console.log(`[Mongoose] ${notice}`);
      }
      connectionPromise = null;
      return null;
    });

  return connectionPromise;
};

export const startDatabaseReconnectLoop = (onConnected?: () => Promise<void>, intervalMs = 30000): void => {
  if (!env.mongodbUri || reconnectTimer) return;
  reconnectTimer = setInterval(() => {
    if (mongoose.connection.readyState === 0 && !connectionPromise) {
      void connectDatabase(onConnected);
    }
  }, intervalMs);
  reconnectTimer.unref();
};

export const closeDatabase = async (): Promise<void> => {
  if (reconnectTimer) {
    clearInterval(reconnectTimer);
    reconnectTimer = null;
  }
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
    connectionPromise = null;
    console.log('[Mongoose] Connection closed gracefully.');
  }
};
