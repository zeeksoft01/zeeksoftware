import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { configureBackendApp } from './backend/src/app';
import { connectDatabase, startDatabaseReconnectLoop, closeDatabase } from './backend/src/config/database';
import { seedDatabaseIfEmpty, emailMarketingService } from './backend/src/services';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Mount the MVC Backend API (/api/*)
configureBackendApp(app, { standalone: false });

async function startServer() {
  // Initiate Mongoose connection concurrently so Express/Vite bind port 3000 immediately
  void connectDatabase(seedDatabaseIfEmpty);
  startDatabaseReconnectLoop(seedDatabaseIfEmpty);
  emailMarketingService.startEmailScheduler();

  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    const assetsPath = path.join(distPath, 'assets');

    // Long-term immutable cache for hashed Vite JS/CSS bundles
    app.use(
      '/assets',
      express.static(assetsPath, {
        maxAge: '1y',
        immutable: true,
        fallthrough: true,
      })
    );

    // Other static files with moderate cache, never caching index.html
    app.use(
      express.static(distPath, {
        index: false,
        maxAge: '1h',
      })
    );

    app.get('*', (_req: Request, res: Response) => {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Zeek Softwares full-stack server running on port ${PORT} (${process.env.NODE_ENV || 'development'})`);
    if (!isProduction || process.env.ENABLE_SWAGGER === 'true') {
      console.log(`📘 Swagger API Docs available at http://localhost:${PORT}/api-docs`);
    }
  });

  // Production socket/request timeouts against Slowloris / hung connections
  server.requestTimeout = 30_000;
  server.headersTimeout = 35_000;
  server.keepAliveTimeout = 65_000;

  let isShuttingDown = false;
  const shutdown = async (signal: string) => {
    if (isShuttingDown) return;
    isShuttingDown = true;
    console.log(`[Server] Received ${signal}. Closing connections...`);
    emailMarketingService.stopEmailScheduler();

    const forceExitTimer = setTimeout(() => {
      console.error('[Server] Forced exit after graceful shutdown timeout.');
      process.exit(1);
    }, 10_000);
    forceExitTimer.unref();

    server.close(async () => {
      await closeDatabase();
      process.exit(0);
    });
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('unhandledRejection', (reason) => {
    console.error('[Process] Unhandled Promise Rejection:', reason);
  });
  process.on('uncaughtException', (err) => {
    console.error('[Process] Uncaught Exception:', err);
    if (isProduction) {
      void shutdown('uncaughtException');
    }
  });
}

startServer();
