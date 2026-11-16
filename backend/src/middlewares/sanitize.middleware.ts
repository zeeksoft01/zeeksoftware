import { Request, Response, NextFunction } from 'express';
import { stripUnsafeMongoKeys } from '../utils/security';

/**
 * Global request sanitizer preventing NoSQL operator injection ($ne, $gt, $where, $set)
 * and JavaScript prototype pollution (__proto__, constructor, prototype) across query, params, and JSON body.
 */
export const sanitizeRequestInput = (req: Request, _res: Response, next: NextFunction): void => {
  // Raw webhook buffer must remain untouched for HMAC verification
  if (Buffer.isBuffer(req.body)) {
    next();
    return;
  }

  if (req.body && typeof req.body === 'object') {
    req.body = stripUnsafeMongoKeys(req.body);
  }
  if (req.query && typeof req.query === 'object') {
    req.query = stripUnsafeMongoKeys(req.query);
  }
  if (req.params && typeof req.params === 'object') {
    req.params = stripUnsafeMongoKeys(req.params);
  }

  next();
};
