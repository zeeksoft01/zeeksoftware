import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/ApiError';

interface RateEntry {
  count: number;
  resetAt: number;
}

const MAX_STORE_ENTRIES = 10_000;

export const createRateLimiter = (windowMs: number, maxRequests: number, keyPrefix = 'rl') => {
  const store = new Map<string, RateEntry>();

  // Periodically evict expired entries to prevent unbounded memory growth
  const sweepTimer = setInterval(() => {
    const now = Date.now();
    for (const [k, entry] of store.entries()) {
      if (now > entry.resetAt) {
        store.delete(k);
      }
    }
  }, Math.max(windowMs, 60_000));
  sweepTimer.unref();

  return (req: Request, res: Response, next: NextFunction): void => {
    const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
    const key = `${keyPrefix}:${clientIp}:${req.baseUrl || ''}${req.path}`;
    const now = Date.now();
    const existing = store.get(key);

    if (!existing || now > existing.resetAt) {
      if (store.size >= MAX_STORE_ENTRIES) {
        const oldestKey = store.keys().next().value;
        if (oldestKey) store.delete(oldestKey);
      }
      const resetAt = now + windowMs;
      store.set(key, { count: 1, resetAt });
      res.setHeader('X-RateLimit-Limit', String(maxRequests));
      res.setHeader('X-RateLimit-Remaining', String(Math.max(0, maxRequests - 1)));
      next();
      return;
    }

    if (existing.count >= maxRequests) {
      const retryAfterSec = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
      res.setHeader('Retry-After', String(retryAfterSec));
      res.setHeader('X-RateLimit-Limit', String(maxRequests));
      res.setHeader('X-RateLimit-Remaining', '0');
      next(new ApiError(429, 'Too many requests. Please wait a moment and try again.'));
      return;
    }

    existing.count += 1;
    res.setHeader('X-RateLimit-Limit', String(maxRequests));
    res.setHeader('X-RateLimit-Remaining', String(Math.max(0, maxRequests - existing.count)));
    next();
  };
};
