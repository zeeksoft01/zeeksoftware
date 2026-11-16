import { Router } from 'express';
import { authController } from '../controllers';
import { createRateLimiter, requireAuth, validate } from '../middlewares';
import {
  authLoginSchema,
  authRegisterSchema,
  becomeAffiliateSchema,
} from '../validations';

const router = Router();
const authRegisterLimiter = createRateLimiter(60_000, 15, 'auth-reg');
const authLoginLimiter = createRateLimiter(5 * 60_000, 20, 'auth-login');

router.post('/auth/register', authRegisterLimiter, validate(authRegisterSchema), authController.register);
router.post('/auth/login', authLoginLimiter, validate(authLoginSchema), authController.login);
router.get('/auth/me', requireAuth, authController.me);
router.post(
  '/auth/become-affiliate',
  requireAuth,
  validate(becomeAffiliateSchema),
  authController.becomeAffiliate
);

export default router;
