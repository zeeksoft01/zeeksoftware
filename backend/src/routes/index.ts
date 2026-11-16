import { Router } from 'express';
import healthRoutes from './health.routes';
import storeRoutes from './store.routes';
import orderRoutes from './order.routes';
import paymentRoutes from './payment.routes';
import affiliateRoutes from './affiliate.routes';
import adminRoutes from './admin.routes';
import authRoutes from './auth.routes';
import emailRoutes from './email.routes';
import deliveryRoutes from './delivery.routes';

const apiRouter = Router();

apiRouter.use(healthRoutes);
apiRouter.use(authRoutes);
apiRouter.use(storeRoutes);
apiRouter.use(orderRoutes);
apiRouter.use(paymentRoutes);
apiRouter.use(affiliateRoutes);
apiRouter.use(emailRoutes);
apiRouter.use(deliveryRoutes);
apiRouter.use(adminRoutes);

export default apiRouter;

