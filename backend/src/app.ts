import express, { Express, Request, Response, NextFunction } from 'express';
import cors, { CorsOptions } from 'cors';
import helmet from 'helmet';
import { env } from './config/env';
import apiRouter from './routes';
import {
  createRateLimiter,
  requestLogger,
  sanitizeRequestInput,
  notFoundApiHandler,
  errorHandler,
} from './middlewares';
import { setupSwaggerDocs } from '../documentations/swagger.config';

export interface ConfigureBackendOptions {
  standalone?: boolean;
}

const HIGH_PAYLOAD_PATH_PREFIXES = [
  '/api/admin/upload-image',
  '/api/admin/products',
  '/api/admin/settings',
  '/api/admin/cms',
  '/api/admin/email/contacts/import',
  '/api/admin/email/campaigns',
  '/api/orders',
  '/api/auth/register',
  '/api/affiliates/register',
];

const parseAllowedCorsOrigins = (): string[] => {
  if (!env.corsOrigin || env.corsOrigin === '*') return [];
  return env.corsOrigin
    .split(',')
    .map((s) => s.trim().replace(/\/$/, ''))
    .filter(Boolean);
};

const getTrustedProductionOrigins = (req: Request): Set<string> => {
  const allowed = new Set<string>();
  if (env.appUrl && !env.appUrl.includes('MY_APP_URL')) {
    try {
      allowed.add(new URL(env.appUrl).origin.toLowerCase());
    } catch {
      // ignore invalid APP_URL
    }
  }
  const host = (req.get('host') || '').trim().toLowerCase();
  if (host && /^[a-z0-9.-]+(:\d{1,5})?$/.test(host)) {
    allowed.add(`https://${host}`);
    allowed.add(`http://${host}`);
  }
  return allowed;
};

export const configureBackendApp = (
  app: Express,
  options: ConfigureBackendOptions = {}
): Express => {
  const { standalone = false } = options;

  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  // Security headers (COOP/CORP/CSP/X-Frame relaxed for AI Studio iframe preview while enforcing HSTS, nosniff, referrerPolicy)
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
      crossOriginOpenerPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      xFrameOptions: false,
      noSniff: true,
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
      hsts: env.isProduction ? { maxAge: 31536000, includeSubDomains: true } : false,
    })
  );

  const explicitOrigins = parseAllowedCorsOrigins();
  app.use((req: Request, res: Response, next: NextFunction) => {
    const corsMiddleware = cors((corsReq, callback) => {
      const originHeader = (corsReq.headers.origin || '').trim().replace(/\/$/, '');
      const opts: CorsOptions = {
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
        maxAge: 86400,
      };

      if (!originHeader) {
        callback(null, { ...opts, origin: true });
        return;
      }

      if (explicitOrigins.length > 0) {
        const isAllowed = explicitOrigins.includes(originHeader);
        callback(null, { ...opts, origin: isAllowed });
        return;
      }

      if (!env.isProduction) {
        callback(null, { ...opts, origin: true });
        return;
      }

      // Production with CORS_ORIGIN unset/'*': restrict credentialed CORS to APP_URL & same-host origins
      const trusted = getTrustedProductionOrigins(req);
      callback(null, { ...opts, origin: trusted.has(originHeader.toLowerCase()) });
    });

    corsMiddleware(req, res, next);
  });

  // Paystack webhook needs raw body for HMAC verification before JSON parsing
  app.use('/api/paystack/webhook', express.raw({ type: 'application/json', limit: '1mb' }));

  // Larger JSON body limit (12mb) strictly for image/CMS/CSV upload endpoints
  const largeJsonParser = express.json({ limit: '12mb' });
  const standardJsonParser = express.json({ limit: '2mb' });
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (HIGH_PAYLOAD_PATH_PREFIXES.some((prefix) => req.path.startsWith(prefix))) {
      largeJsonParser(req, res, next);
    } else {
      standardJsonParser(req, res, next);
    }
  });

  app.use(express.urlencoded({ extended: true, limit: '1mb' }));
  app.use(sanitizeRequestInput);
  app.use(requestLogger);

  // Global baseline API rate limit (excludes Paystack server-to-server webhook)
  const globalApiLimiter = createRateLimiter(60_000, 300, 'api-global');
  app.use('/api', (req: Request, res: Response, next: NextFunction) => {
    if (req.path === '/paystack/webhook') {
      next();
      return;
    }
    globalApiLimiter(req, res, next);
  });

  // Expose Swagger Interactive API Docs only in non-production unless ENABLE_SWAGGER=true
  if (!env.isProduction || env.enableSwagger) {
    setupSwaggerDocs(app);
  }

  // Mount all MVC API routes under /api
  app.use('/api', apiRouter);

  if (standalone) {
    app.get('/', (_req, res) => {
      res.json({
        service: 'Zeek Softwares Backend API',
        status: 'running',
        ...(!env.isProduction || env.enableSwagger
          ? { docsUrl: '/api-docs', openApiJsonUrl: '/api-docs.json' }
          : {}),
        healthUrl: '/api/health',
      });
    });
    app.use('/api/*', notFoundApiHandler);
  } else {
    // Only intercept unmatched /api/* routes when mounted alongside Vite/SPA
    app.use('/api/*', notFoundApiHandler);
  }

  app.use(errorHandler);
  return app;
};

export const createBackendApp = (options: ConfigureBackendOptions = { standalone: true }): Express => {
  const app = express();
  return configureBackendApp(app, options);
};
