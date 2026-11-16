import { env } from './config/env';
import { connectDatabase, startDatabaseReconnectLoop, closeDatabase } from './config/database';
import { seedDatabaseIfEmpty } from './services';
import { createBackendApp } from './app';

const startStandaloneServer = async () => {
  await connectDatabase(seedDatabaseIfEmpty);
  startDatabaseReconnectLoop(seedDatabaseIfEmpty);

  const app = createBackendApp({ standalone: true });
  const server = app.listen(env.port, '0.0.0.0', () => {
    console.log(`Zeek Softwares standalone backend API running on port ${env.port}`);
    console.log(`Swagger API Docs available at http://localhost:${env.port}/api-docs`);
  });

  const shutdown = async (signal: string) => {
    console.log(`[Server] Received ${signal}. Shutting down gracefully...`);
    server.close(async () => {
      await closeDatabase();
      process.exit(0);
    });
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
};

startStandaloneServer();
