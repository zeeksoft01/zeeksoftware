import { Router } from 'express';
import { orderController } from '../controllers';
import { validate, createRateLimiter } from '../middlewares';
import {
  createOrderSchema,
  lookupOrdersSchema,
  manualPaymentSchema,
  orderIdParamSchema,
} from '../validations';

const router = Router();
const orderWriteLimiter = createRateLimiter(60_000, 20, 'order-write');
const orderLookupLimiter = createRateLimiter(60_000, 15, 'order-lookup');

router.post('/orders', orderWriteLimiter, validate(createOrderSchema), orderController.createOrder);
router.post('/orders/lookup', orderLookupLimiter, validate(lookupOrdersSchema), orderController.lookupOrders);
router.get('/orders/:orderId', orderLookupLimiter, validate(orderIdParamSchema), orderController.getOrderById);
router.post(
  '/orders/:orderId/manual-payment',
  orderWriteLimiter,
  validate(manualPaymentSchema),
  orderController.submitManualPayment
);

export default router;
