import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/ApiError';
import { AuthenticatedAdminRequest } from '../middlewares/auth.middleware';
import { cmsService, deliveryService, productService } from '../services';

export const deliveryController = {
  // --- Public Customer Order Delivery & Protected Downloads ---
  getOrderDelivery: asyncHandler(async (req: Request, res: Response) => {
    const orderId = req.params.orderId;
    const token = typeof req.query.token === 'string' ? req.query.token : undefined;
    const email = typeof req.query.email === 'string' ? req.query.email : undefined;
    const bundle = await deliveryService.getCustomerDeliveryBundle(orderId, { token, email });
    res.json({ success: true, ...bundle });
  }),

  downloadByToken: asyncHandler(async (req: Request, res: Response) => {
    await deliveryService.streamProtectedDownload(req.params.token, res);
  }),

  redirectByToken: asyncHandler(async (req: Request, res: Response) => {
    const destination = await deliveryService.trackAndResolveRedirect(req.params.token);
    res.redirect(302, destination);
  }),

  // --- Admin Digital Assets & Post-Payment Destination Management ---
  listDigitalAssets: asyncHandler(async (_req: Request, res: Response) => {
    const assets = await deliveryService.listDigitalAssets();
    res.json({ success: true, assets });
  }),

  uploadDigitalAsset: asyncHandler(async (req: AuthenticatedAdminRequest, res: Response) => {
    const file = req.file;
    if (!file) {
      throw new ApiError(400, 'Please select a digital product file to upload.');
    }
    const adminLabel = req.adminAuth?.email || req.adminAuth?.name || 'Admin';
    const asset = await deliveryService.uploadDigitalAsset({
      buffer: file.buffer,
      originalName: file.originalname,
      mimeType: file.mimetype,
      title: typeof req.body?.title === 'string' ? req.body.title : file.originalname,
      uploadedBy: adminLabel,
    });
    res.status(201).json({ success: true, asset });
  }),

  deleteDigitalAsset: asyncHandler(async (req: Request, res: Response) => {
    const deleted = await deliveryService.deleteDigitalAsset(req.params.id);
    if (!deleted) throw new ApiError(404, 'Digital asset not found');
    res.json({ success: true });
  }),

  previewDestination: asyncHandler(async (req: Request, res: Response) => {
    const { productId, overridePostPaymentConfig, overrideProductConfig } = req.body;
    const [settings, product] = await Promise.all([
      cmsService.getSettings(),
      productId ? productService.getProductById(productId) : Promise.resolve(null),
    ]);

    const mergedSettings = overridePostPaymentConfig
      ? {
          ...settings,
          postPaymentConfig: {
            ...(settings.postPaymentConfig || {}),
            ...overridePostPaymentConfig,
          },
        }
      : settings;

    const mergedProduct = product
      ? {
          ...product,
          ...(overrideProductConfig ? { deliveryConfig: overrideProductConfig } : {}),
        }
      : overrideProductConfig
      ? {
          id: 'preview-prod',
          name: 'Sample Software Plan',
          duration: '1 Year',
          price: 5000,
          deliveryConfig: overrideProductConfig,
        }
      : null;

    const resolved = deliveryService.resolveSingleProductDestination({
      product: mergedProduct,
      itemSummary: {
        productId: mergedProduct?.id || 'prod-sample',
        productName: mergedProduct?.name || 'Sample Software Plan',
        duration: mergedProduct?.duration || '1 Year',
      },
      settings: mergedSettings,
      downloadToken: 'SAMPLE-PREVIEW-TOKEN',
    });

    res.json({ success: true, preview: resolved });
  }),

  listDeliveryRecords: asyncHandler(async (req: Request, res: Response) => {
    const records = await deliveryService.listAdminDeliveryRecords({
      search: typeof req.query.search === 'string' ? req.query.search : undefined,
      status: typeof req.query.status === 'string' ? req.query.status : undefined,
      destinationType:
        typeof req.query.destinationType === 'string' ? req.query.destinationType : undefined,
      productId: typeof req.query.productId === 'string' ? req.query.productId : undefined,
    });
    res.json({ success: true, records });
  }),

  toggleDeliveryAccess: asyncHandler(async (req: Request, res: Response) => {
    const enabled = Boolean(req.body?.enabled);
    const record = await deliveryService.toggleDownloadPermission(req.params.id, enabled);
    res.json({ success: true, record });
  }),

  resendDeliveryEmail: asyncHandler(async (req: Request, res: Response) => {
    const result = await deliveryService.resendDeliveryInstructions(req.params.id);
    res.json({ success: true, ...result });
  }),

  getDeliveryReports: asyncHandler(async (_req: Request, res: Response) => {
    const report = await deliveryService.getDeliveryReports();
    res.json({ success: true, ...report });
  }),

  exportDeliveryReportsCsv: asyncHandler(async (_req: Request, res: Response) => {
    const csv = await deliveryService.exportDeliveryReportsCsv();
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="zeek-delivery-reports.csv"');
    res.send(csv);
  }),
};
