import { Request, Response } from 'express';
import { getMongoConnectionStatus, isDatabaseConnected, pingDatabase } from '../config/database';
import { env } from '../config/env';
import { asyncHandler } from '../utils/asyncHandler';

export const healthController = {
  checkHealth: asyncHandler(async (_req: Request, res: Response) => {
    const conn = getMongoConnectionStatus();
    const now = new Date().toISOString();

    if (isDatabaseConnected()) {
      const ping = await pingDatabase();
      if (ping.ok) {
        if (env.isProduction) {
          res.json({
            status: 'ok',
            database: 'connected',
            timestamp: now,
          });
          return;
        }

        res.json({
          status: 'ok',
          database: 'connected',
          type: 'mongodb',
          orm: 'mongoose',
          latencyMs: ping.latencyMs,
          databaseName: conn.databaseName,
          timestamp: now,
        });
        return;
      }

      res.status(503).json({
        status: 'error',
        database: 'disconnected',
        ...(env.isProduction ? {} : { type: 'mongodb', error: ping.error || 'MongoDB ping failed' }),
        timestamp: now,
      });
      return;
    }

    if (env.isProduction) {
      res.status(503).json({
        status: 'error',
        database: 'disconnected',
        timestamp: now,
      });
      return;
    }

    res.status(503).json({
      status: 'error',
      database: conn.state,
      type: 'mongodb',
      orm: 'mongoose',
      message: conn.uriConfigured
        ? `MongoDB connection state: ${conn.state}`
        : 'MONGODB_URI is not configured. Provide MONGODB_URI (Atlas or Compass) to connect to MongoDB.',
      ...(conn.uriConfigured && conn.hint ? { hint: conn.hint } : {}),
      ...(conn.uriConfigured && conn.lastError ? { lastError: conn.lastError } : {}),
      databaseName: env.mongodbDbName,
      timestamp: now,
    });
  }),
};
