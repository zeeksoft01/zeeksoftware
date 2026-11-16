import { Request, Response, NextFunction } from 'express';

const redactSensitiveQueryParams = (rawUrl: string): string => {
  const qIdx = rawUrl.indexOf('?');
  if (qIdx === -1) return rawUrl;
  const pathPart = rawUrl.slice(0, qIdx);
  const queryPart = rawUrl.slice(qIdx + 1);
  const redacted = queryPart.replace(
    /(^|&)(token|secret|password|key|authorization|email|code)=([^&]*)/gi,
    '$1$2=[REDACTED]'
  );
  return `${pathPart}?${redacted}`;
};

export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.path.startsWith('/api')) {
    next();
    return;
  }

  const start = Date.now();
  const safeUrl = redactSensitiveQueryParams(req.originalUrl);
  res.on('finish', () => {
    const ms = Date.now() - start;
    console.log(`[API] ${req.method} ${safeUrl} -> ${res.statusCode} (${ms}ms)`);
  });
  next();
};
