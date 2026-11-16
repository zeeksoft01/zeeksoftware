import { Router } from 'express';
import { adminController } from '../controllers';
import { validate, requireAdmin } from '../middlewares';
import {
  adjustAffiliateBalanceSchema,
  adminUserIdParamSchema,
  createProductSchema,
  productIdParamSchema,
  registerAdminSchema,
  replyInquirySchema,
  updateAdminOrderSchema,
  updateAdminUserSchema,
  updateCmsSchema,
  updateExchangeRateSchema,
  updateInquiryStatusSchema,
  updateProductSchema,
  updateReviewSchema,
  updateSettingsSchema,
  updateWithdrawalStatusSchema,
  uploadImageSchema,
  uploadProductImageSchema,
} from '../validations';

const router = Router();

// Protected admin routes
router.use('/admin', requireAdmin);

router.get('/admin/dashboard', adminController.getDashboard);
router.get('/admin/orders', adminController.getOrders);
router.patch('/admin/orders/:orderId', validate(updateAdminOrderSchema), adminController.updateOrder);

router.post('/admin/products', validate(createProductSchema), adminController.createProduct);
router.put('/admin/products/:id', validate(updateProductSchema), adminController.updateProduct);
router.post(
  '/admin/products/:id/image',
  validate(uploadProductImageSchema),
  adminController.uploadProductImage
);
router.delete('/admin/products/:id', validate(productIdParamSchema), adminController.deleteProduct);

router.put('/admin/settings', validate(updateSettingsSchema), adminController.updateSettings);
router.put(
  '/admin/exchange-rate',
  validate(updateExchangeRateSchema),
  adminController.updateExchangeRate
);
router.post('/admin/cms/reset-slides', adminController.resetHeroSlides);
router.put('/admin/cms/:section', validate(updateCmsSchema), adminController.updateCmsSection);

router.get('/admin/reviews', adminController.getReviews);
router.patch('/admin/reviews/:id', validate(updateReviewSchema), adminController.updateReview);
router.delete('/admin/reviews/:id', validate(productIdParamSchema), adminController.deleteReview);

router.get('/admin/inquiries', adminController.getInquiries);
router.patch('/admin/inquiries/:id/read', validate(productIdParamSchema), adminController.markInquiryRead);
router.post('/admin/inquiries/:id/reply', validate(replyInquirySchema), adminController.replyToInquiry);
router.patch(
  '/admin/inquiries/:id/status',
  validate(updateInquiryStatusSchema),
  adminController.updateInquiryStatus
);

router.get('/admin/audit-logs', adminController.getAuditLogs);
router.post('/admin/upload-image', validate(uploadImageSchema), adminController.uploadImage);

// Admin Affiliate Management
router.get('/admin/affiliates', adminController.getAffiliates);
router.get('/admin/referred-customers', adminController.getReferredCustomers);
router.post(
  '/admin/affiliates/:affiliateId/adjust-balance',
  validate(adjustAffiliateBalanceSchema),
  adminController.adjustAffiliateBalance
);
router.get('/admin/withdrawals', adminController.getWithdrawals);
router.patch(
  '/admin/withdrawals/:withdrawalId',
  validate(updateWithdrawalStatusSchema),
  adminController.updateWithdrawalStatus
);

// Admin User Accounts Management (only authenticated verified admins can register/verify/manage admins)
router.get('/admin/users', adminController.getAdminUsers);
router.post('/admin/users', validate(registerAdminSchema), adminController.registerAdminUser);
router.patch('/admin/users/:id', validate(updateAdminUserSchema), adminController.updateAdminUser);
router.delete('/admin/users/:id', validate(adminUserIdParamSchema), adminController.deleteAdminUser);

export default router;
