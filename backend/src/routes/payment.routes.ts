import { Router } from 'express';
import { paymentController } from '../controllers';
import { createRateLimiter, validate } from '../middlewares';
import { initializePaystackSchema, verifyPaystackSchema } from '../validations';

const router = Router();
const paystackLimiter = createRateLimiter(60_000, 30, 'paystack');
const webhookLimiter = createRateLimiter(60_000, 120, 'paystack-wh');

router.post(
  '/paystack/initialize',
  paystackLimiter,
  validate(initializePaystackSchema),
  paymentController.initializePaystack
);
router.get(
  '/paystack/verify/:reference',
  paystackLimiter,
  validate(verifyPaystackSchema),
  paymentController.verifyPaystack
);
router.post('/paystack/webhook', webhookLimiter, paymentController.handlePaystackWebhook);

export default router;
