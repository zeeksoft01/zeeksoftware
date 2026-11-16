import { Express, Request, Response } from 'express';
import swaggerUi from 'swagger-ui-express';
import { openApiComponents } from './components.docs';
import { healthPaths } from './paths/health.docs';
import { storePaths } from './paths/store.docs';
import { orderPaths } from './paths/orders.docs';
import { paymentPaths } from './paths/payments.docs';
import { affiliatePaths } from './paths/affiliates.docs';
import { adminPaths } from './paths/admin.docs';
import { emailPaths } from './paths/email.docs';

export const swaggerDocument = {
  openapi: '3.0.3',
  info: {
    title: 'Zeek Softwares Backend API',
    version: '1.0.0',
    description:
      'Production-ready Node.js, Express, TypeScript & Mongoose (MongoDB) REST API following MVC architecture (Models, Validations, Controllers, Middlewares, Services, Utils). Connect MongoDB Compass or MongoDB Atlas via MONGODB_URI to test all endpoints live.',
    contact: {
      name: 'Zeek Softwares Engineering',
      email: 'Zeeksoftwares@gmail.com',
    },
  },
  servers: [
    {
      url: '/',
      description: 'Current Active Server (Same Origin)',
    },
    {
      url: 'http://localhost:3000',
      description: 'Full-Stack App Server (Port 3000)',
    },
    {
      url: 'http://localhost:5000',
      description: 'Standalone Backend Server (Port 5000)',
    },
  ],
  tags: [
    { name: 'Health', description: 'API & MongoDB Compass/Atlas connection health' },
    { name: 'Storefront', description: 'Bootstrap, products, contact inquiries & customer reviews' },
    { name: 'Orders', description: 'Order creation, lookup & manual payment proof workflow' },
    { name: 'Payments', description: 'Paystack initialization, verification & webhooks' },
    { name: 'Affiliates', description: 'Partner registration, referral tracking, dashboard & payouts' },
    { name: 'Admin', description: 'Protected administrative management endpoints' },
    { name: 'Email & SMTP', description: 'Brevo API v3, SMTP diagnostics, contacts & campaigns' },
  ],
  components: openApiComponents,
  paths: {
    ...healthPaths,
    ...storePaths,
    ...orderPaths,
    ...paymentPaths,
    ...affiliatePaths,
    ...adminPaths,
    ...emailPaths,
  },
};

export const setupSwaggerDocs = (app: Express): void => {
  app.get('/api-docs.json', (_req: Request, res: Response) => {
    res.setHeader('Content-Type', 'application/json');
    res.json(swaggerDocument);
  });

  app.use(
    '/api-docs',
    swaggerUi.serve,
    swaggerUi.setup(swaggerDocument, {
      explorer: true,
      customSiteTitle: 'Zeek Softwares API Docs (Swagger)',
      swaggerOptions: {
        persistAuthorization: true,
        docExpansion: 'list',
        filter: true,
      },
    })
  );
};
