import { Router } from 'express';
import multer from 'multer';
import { deliveryController } from '../controllers';
import { createRateLimiter, requireAdmin, validate } from '../middlewares';
import {
  deliveryIdParamSchema,
  deliveryOrderParamSchema,
  deliveryTokenParamSchema,
  toggleDeliveryAccessSchema,
} from '../validations';

const router = Router();
const publicDeliveryLimiter = createRateLimiter(60_000, 40, 'delivery');

const uploadDigitalMemory = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50 MB max digital product asset
    files: 1,
  },
});

// --- Public Order Delivery & Protected File Download Routes ---
router.get(
  '/delivery/order/:orderId',
  publicDeliveryLimiter,
  validate(deliveryOrderParamSchema),
  deliveryController.getOrderDelivery
);
router.get(
  '/delivery/download/:token',
  publicDeliveryLimiter,
  validate(deliveryTokenParamSchema),
  deliveryController.downloadByToken
);
router.get(
  '/delivery/redirect/:token',
  publicDeliveryLimiter,
  validate(deliveryTokenParamSchema),
  deliveryController.redirectByToken
);

// --- Admin Payment Destination & Digital Product Delivery Routes ---
router.use('/admin/delivery', requireAdmin);

router.get('/admin/delivery/assets', deliveryController.listDigitalAssets);
router.post(
  '/admin/delivery/assets',
  uploadDigitalMemory.single('file'),
  deliveryController.uploadDigitalAsset
);
router.delete(
  '/admin/delivery/assets/:id',
  validate(deliveryIdParamSchema),
  deliveryController.deleteDigitalAsset
);

router.post('/admin/delivery/preview', deliveryController.previewDestination);
router.get('/admin/delivery/records', deliveryController.listDeliveryRecords);
router.patch(
  '/admin/delivery/records/:id/toggle',
  validate(toggleDeliveryAccessSchema),
  deliveryController.toggleDeliveryAccess
);
router.post(
  '/admin/delivery/records/:id/resend',
  validate(deliveryIdParamSchema),
  deliveryController.resendDeliveryEmail
);
router.get('/admin/delivery/reports', deliveryController.getDeliveryReports);
router.get('/admin/delivery/reports/export', deliveryController.exportDeliveryReportsCsv);

export default router;
