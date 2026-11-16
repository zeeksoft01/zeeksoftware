import crypto from 'crypto';

/**
 * Constant-time equality comparison using SHA-256 digests so differing lengths
 * never throw ERR_CRYPTO_TIMING_SAFE_EQUAL_LENGTH or leak length timing.
 */
export const safeTimingEqual = (a: string, b: string): boolean => {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const digestA = crypto.createHash('sha256').update(a, 'utf8').digest();
  const digestB = crypto.createHash('sha256').update(b, 'utf8').digest();
  return crypto.timingSafeEqual(digestA, digestB);
};

export const cryptoRandomHex = (bytes = 4): string =>
  crypto.randomBytes(bytes).toString('hex').toUpperCase();

export const escapeRegExp = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Validates that a URL uses an explicit HTTP(S) scheme and contains no dangerous schemes or embedded credentials.
 */
export const isSafeHttpUrl = (rawUrl: string): boolean => {
  const trimmed = (rawUrl || '').trim();
  if (!trimmed) return false;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return false;
    }
    if (parsed.username || parsed.password) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
};

/**
 * Sanitizes a user/admin HTML fragment for branded transactional/marketing emails.
 * Removes scriptable tags, inline event handlers, and javascript:/vbscript:/data: URIs.
 */
export const sanitizeRichHtml = (html: string): string => {
  if (!html) return '';
  return String(html)
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/<(iframe|object|embed|applet|form|meta|base|link|svg)[\s\S]*?>([\s\S]*?<\/\1>)?/gi, '')
    .replace(/\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/\s+srcdoc\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/(href|src|action)\s*=\s*(["'])\s*(?:javascript|vbscript|data:text\/html)[^"']*\2/gi, '$1=$2#$2')
    .replace(/expression\s*\([^)]*\)/gi, '');
};

/**
 * Sanitizes filenames for Content-Disposition headers to prevent header injection (CRLF/quotes).
 */
export const sanitizeDownloadFilename = (name: string): string => {
  const cleaned = String(name || 'download')
    .replace(/[\r\n"\\;/]/g, '_')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned.slice(0, 120) || 'download';
};

const BLOCKED_OBJECT_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

/**
 * Recursively clones/cleans plain objects & arrays to strip MongoDB $-operator keys
 * and JS prototype-pollution keys (__proto__, constructor, prototype).
 */
export const stripUnsafeMongoKeys = <T>(input: T, depth = 0): T => {
  if (depth > 20 || input === null || typeof input !== 'object') {
    return input;
  }

  if (Array.isArray(input)) {
    return input.map((item) => stripUnsafeMongoKeys(item, depth + 1)) as unknown as T;
  }

  if (input instanceof Date || Buffer.isBuffer(input)) {
    return input;
  }

  const out: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(input as Record<string, unknown>)) {
    if (key.startsWith('$') || BLOCKED_OBJECT_KEYS.has(key)) {
      continue;
    }
    out[key] = stripUnsafeMongoKeys(val, depth + 1);
  }
  return out as T;
};
