import { Router } from 'express';
import { affiliateController } from '../controllers';
import { validate, requireAffiliate, createRateLimiter } from '../middlewares';
import {
  affiliateLoginSchema,
  registerAffiliateSchema,
  requestWithdrawalSchema,
  trackReferralClickSchema,
} from '../validations';

const router = Router();
const authLimiter = createRateLimiter(60_000, 15, 'aff-auth');
const trackClickLimiter = createRateLimiter(60_000, 30, 'aff-click');
const withdrawalLimiter = createRateLimiter(60_000, 10, 'aff-withdraw');

router.post(
  '/affiliates/register',
  authLimiter,
  validate(registerAffiliateSchema),
  affiliateController.register
);
router.post(
  '/affiliates/login',
  authLimiter,
  validate(affiliateLoginSchema),
  affiliateController.login
);
router.post(
  '/affiliates/track-click',
  trackClickLimiter,
  validate(trackReferralClickSchema),
  affiliateController.trackClick
);
router.get('/affiliates/me', requireAffiliate, affiliateController.getDashboard);
router.post(
  '/affiliates/withdrawals',
  requireAffiliate,
  withdrawalLimiter,
  validate(requestWithdrawalSchema),
  affiliateController.requestWithdrawal
);

export default router;
