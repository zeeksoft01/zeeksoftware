import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { Response } from 'express';
import {
  DestinationType,
  DigitalAsset,
  Order,
  PostPaymentConfig,
  Product,
  ProductDeliveryRecord,
  SiteSettings,
} from '../types';
import {
  DigitalAssetModel,
  OrderModel,
  ProductDeliveryRecordModel,
  ProductModel,
} from '../models';
import { requireDatabaseConnection } from '../config/database';
import { ApiError } from '../utils/ApiError';
import { DEFAULT_POST_PAYMENT_CONFIG } from '../utils/seedData';
import { cmsService } from './cms.service';
import { auditService } from './audit.service';
import { emailService, getPublicAppUrl } from './email.service';
import { isSafeHttpUrl, sanitizeDownloadFilename } from '../utils/security';

// Private upload directory OUTSIDE public/ so raw files are never exposed unauthenticated
export const DIGITAL_PRODUCTS_DIR = path.resolve(process.cwd(), 'storage', 'digital-products');

const ALLOWED_DIGITAL_EXTENSIONS = new Set([
  '.pdf',
  '.zip',
  '.rar',
  '.7z',
  '.docx',
  '.doc',
  '.xlsx',
  '.xls',
  '.pptx',
  '.ppt',
  '.txt',
  '.csv',
  '.mp4',
  '.mov',
  '.mp3',
  '.wav',
  '.png',
  '.jpg',
  '.jpeg',
  '.webp',
  '.apk',
  '.exe',
  '.dmg',
  '.iso',
  '.json',
]);

const ensureStorageDir = () => {
  if (!fs.existsSync(DIGITAL_PRODUCTS_DIR)) {
    fs.mkdirSync(DIGITAL_PRODUCTS_DIR, { recursive: true });
  }
};

const interpolateVariables = (
  template: string,
  vars: {
    orderId: string;
    customerName: string;
    customerEmail: string;
    productName: string;
    duration: string;
    amount: string;
  }
): string => {
  return String(template || '')
    .replace(/\{\{\s*orderId\s*\}\}/gi, vars.orderId)
    .replace(/\{\{\s*customerName\s*\}\}/gi, vars.customerName)
    .replace(/\{\{\s*customerEmail\s*\}\}/gi, vars.customerEmail)
    .replace(/\{\{\s*productName\s*\}\}/gi, vars.productName)
    .replace(/\{\{\s*duration\s*\}\}/gi, vars.duration)
    .replace(/\{\{\s*amount\s*\}\}/gi, vars.amount);
};

export interface ResolvedDestinationItem {
  productId: string;
  productName: string;
  duration: string;
  destinationType: DestinationType;
  destinationUrl: string;
  whatsappMessage?: string;
  digitalAssetId?: string;
  digitalFileName?: string;
  digitalMimeType?: string;
  digitalFileSize?: number;
  downloadToken: string;
  downloadEnabled: boolean;
  downloadCount: number;
  deliveryStatus: ProductDeliveryRecord['deliveryStatus'];
}

export const deliveryService = {
  async listDigitalAssets(): Promise<DigitalAsset[]> {
    requireDatabaseConnection();
    const docs = await DigitalAssetModel.find().sort({ createdAt: -1 }).lean();
    return docs.map(({ _id, ...rest }) => rest as DigitalAsset);
  },

  async uploadDigitalAsset(input: {
    buffer: Buffer;
    originalName: string;
    mimeType: string;
    title?: string;
    uploadedBy?: string;
  }): Promise<DigitalAsset> {
    requireDatabaseConnection();
    if (!input.buffer || input.buffer.length === 0) {
      throw new ApiError(400, 'Uploaded file is empty.');
    }

    const ext = path.extname(input.originalName || '').toLowerCase();
    if (!ext || !ALLOWED_DIGITAL_EXTENSIONS.has(ext)) {
      throw new ApiError(
        400,
        `Unsupported digital file format "${ext || 'unknown'}". Allowed formats include PDF, ZIP, DOCX, MP4, MP3, APK, DMG, EXE, PNG, JPG.`
      );
    }

    ensureStorageDir();

    const id = `asset-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const safeBase = path
      .basename(input.originalName, ext)
      .replace(/[^a-zA-Z0-9._-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60);
    const storedFileName = `${id}-${safeBase || 'product'}${ext}`;
    const fullPath = path.join(DIGITAL_PRODUCTS_DIR, storedFileName);

    fs.writeFileSync(fullPath, input.buffer);
    const sha256 = crypto.createHash('sha256').update(input.buffer).digest('hex');
    const now = new Date().toISOString();

    const asset: DigitalAsset = {
      id,
      title: (input.title || safeBase || input.originalName).trim(),
      originalFileName: path.basename(input.originalName),
      storedFileName,
      mimeType: input.mimeType || 'application/octet-stream',
      sizeBytes: input.buffer.length,
      sha256,
      uploadedBy: input.uploadedBy || 'Admin',
      createdAt: now,
      updatedAt: now,
    };

    await DigitalAssetModel.create(asset);
    await auditService.addLog(
      'Digital Product Uploaded',
      `Admin uploaded digital product "${asset.title}" (${asset.originalFileName}, ${(
        asset.sizeBytes / 1024
      ).toFixed(1)} KB)`,
      input.uploadedBy || 'Admin'
    );

    return asset;
  },

  async deleteDigitalAsset(id: string): Promise<boolean> {
    requireDatabaseConnection();
    const asset = await DigitalAssetModel.findOne({ id }).lean();
    if (!asset) return false;

    const fullPath = path.join(DIGITAL_PRODUCTS_DIR, path.basename(asset.storedFileName));
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }

    await DigitalAssetModel.deleteOne({ id });
    await ProductModel.updateMany(
      { 'deliveryConfig.digitalAssetId': id },
      {
        $unset: {
          'deliveryConfig.digitalAssetId': '',
          'deliveryConfig.digitalFileName': '',
          'deliveryConfig.digitalFileSize': '',
          'deliveryConfig.digitalMimeType': '',
        },
      }
    );

    await auditService.addLog(
      'Digital Product Deleted',
      `Admin deleted digital asset "${asset.title}" (${asset.originalFileName})`,
      'Admin'
    );

    return true;
  },

  resolveSingleProductDestination(params: {
    product?: Partial<Product> | null;
    order?: Pick<Order, 'id' | 'customerName' | 'customerEmail' | 'totalAmount'>;
    itemSummary: { productId: string; productName: string; duration: string };
    settings: SiteSettings;
    downloadToken: string;
  }): {
    destinationType: DestinationType;
    destinationUrl: string;
    whatsappMessage?: string;
    digitalAssetId?: string;
    digitalFileName?: string;
  } {
    const postCfg: PostPaymentConfig = {
      ...DEFAULT_POST_PAYMENT_CONFIG,
      ...(params.settings.postPaymentConfig || {}),
    };
    const prodCfg = params.product?.deliveryConfig;

    let effectiveType: DestinationType = postCfg.defaultDestinationType || 'whatsapp';
    if (prodCfg?.destinationType && prodCfg.destinationType !== 'default') {
      effectiveType = prodCfg.destinationType;
    }

    const vars = {
      orderId: params.order?.id || 'ZEEK-ORD-TEST',
      customerName: params.order?.customerName || 'Valued Customer',
      customerEmail: params.order?.customerEmail || 'customer@example.com',
      productName: params.itemSummary.productName,
      duration: params.itemSummary.duration,
      amount: `₦${(params.order?.totalAmount ?? params.product?.price ?? 0).toLocaleString('en-NG')}`,
    };

    const appBase = getPublicAppUrl();

    if (effectiveType === 'digital_download') {
      const hasAsset = Boolean(prodCfg?.digitalAssetId);
      if (hasAsset) {
        return {
          destinationType: 'digital_download',
          destinationUrl: `${appBase}/api/delivery/download/${encodeURIComponent(params.downloadToken)}`,
          digitalAssetId: prodCfg?.digitalAssetId,
          digitalFileName: prodCfg?.digitalFileName,
        };
      }
      // Graceful fallback if product has digital_download selected without a linked asset yet
      const fallbackUrl = prodCfg?.customRedirectUrl?.trim() || postCfg.customRedirectUrl?.trim();
      if (fallbackUrl) {
        const interpolatedFallback = interpolateVariables(fallbackUrl, vars);
        const normalizedFallback = /^https?:\/\//i.test(interpolatedFallback)
          ? interpolatedFallback
          : `https://${interpolatedFallback}`;
        if (isSafeHttpUrl(normalizedFallback)) {
          return {
            destinationType: 'custom_url',
            destinationUrl: normalizedFallback,
          };
        }
      }
      effectiveType = 'whatsapp';
    }

    if (effectiveType === 'custom_url') {
      const rawUrl =
        (prodCfg?.destinationType === 'custom_url' ? prodCfg.customRedirectUrl : '') ||
        postCfg.customRedirectUrl ||
        '';
      if (rawUrl.trim()) {
        const interpolated = interpolateVariables(rawUrl.trim(), vars);
        const finalUrl = /^https?:\/\//i.test(interpolated) ? interpolated : `https://${interpolated}`;
        if (isSafeHttpUrl(finalUrl)) {
          return {
            destinationType: 'custom_url',
            destinationUrl: finalUrl,
          };
        }
      }
      effectiveType = 'whatsapp';
    }

    // Default / WhatsApp destination
    const rawWaNumber =
      (prodCfg?.destinationType === 'whatsapp' && prodCfg.whatsappNumber) ||
      postCfg.whatsappNumber ||
      params.settings.internationalWhatsApp ||
      '2347045200361';
    const cleanWaNumber = rawWaNumber.replace(/\D/g, '') || '2347045200361';
    const rawMsgTpl =
      (prodCfg?.destinationType === 'whatsapp' && prodCfg.whatsappMessageTemplate) ||
      postCfg.whatsappMessageTemplate ||
      DEFAULT_POST_PAYMENT_CONFIG.whatsappMessageTemplate;
    const waMsg = interpolateVariables(rawMsgTpl, vars);
    return {
      destinationType: 'whatsapp',
      destinationUrl: `https://wa.me/${cleanWaNumber}?text=${encodeURIComponent(waMsg)}`,
      whatsappMessage: waMsg,
    };
  },

  async syncDeliveryRecordsForOrder(order: Order): Promise<ProductDeliveryRecord[]> {
    requireDatabaseConnection();
    const settings = await cmsService.getSettings();
    const productIds = Array.from(new Set((order.items || []).map((i) => i.productId).filter(Boolean)));
    const products = await ProductModel.find({ id: { $in: productIds } }).lean();
    const productMap = new Map<string, Product>();
    for (const p of products) {
      productMap.set(p.id, p as Product);
    }

    const now = new Date().toISOString();
    const savedRecords: ProductDeliveryRecord[] = [];
    const seenProductIds = new Set<string>();

    for (const item of order.items || []) {
      if (!item.productId || seenProductIds.has(item.productId)) continue;
      seenProductIds.add(item.productId);

      const product = productMap.get(item.productId) || null;
      const existing = await ProductDeliveryRecordModel.findOne({
        orderId: order.id,
        productId: item.productId,
      }).lean();

      const downloadToken = existing?.downloadToken || crypto.randomBytes(24).toString('hex');
      const resolved = this.resolveSingleProductDestination({
        product,
        order,
        itemSummary: {
          productId: item.productId,
          productName: item.productName,
          duration: item.duration,
        },
        settings,
        downloadToken,
      });

      let nextDeliveryStatus: ProductDeliveryRecord['deliveryStatus'] = 'pending_payment';
      if (order.paymentStatus === 'paid') {
        if (existing?.downloadEnabled === false) {
          nextDeliveryStatus = 'revoked';
        } else if ((existing?.downloadCount || 0) > 0) {
          nextDeliveryStatus = 'downloaded';
        } else {
          nextDeliveryStatus = 'link_generated';
        }
      }

      if (!existing) {
        const record: ProductDeliveryRecord = {
          id: `del-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          orderId: order.id,
          productId: item.productId,
          productName: item.productName,
          customerName: order.customerName,
          customerEmail: order.customerEmail.trim().toLowerCase(),
          customerWhatsApp: order.customerWhatsApp,
          paymentStatus: order.paymentStatus,
          destinationType: resolved.destinationType,
          destinationUrl: resolved.destinationUrl,
          digitalAssetId: resolved.digitalAssetId,
          digitalFileName: resolved.digitalFileName,
          downloadToken,
          downloadEnabled: true,
          deliveryStatus: nextDeliveryStatus,
          downloadCount: 0,
          resentCount: 0,
          createdAt: now,
          updatedAt: now,
        };
        await ProductDeliveryRecordModel.create(record);
        savedRecords.push(record);
      } else {
        const updated = await ProductDeliveryRecordModel.findOneAndUpdate(
          { id: existing.id },
          {
            $set: {
              paymentStatus: order.paymentStatus,
              destinationType: resolved.destinationType,
              destinationUrl: resolved.destinationUrl,
              digitalAssetId: resolved.digitalAssetId,
              digitalFileName: resolved.digitalFileName,
              deliveryStatus: nextDeliveryStatus,
              updatedAt: now,
            },
          },
          { new: true }
        ).lean();
        if (updated) {
          const { _id, ...rest } = updated;
          savedRecords.push(rest as ProductDeliveryRecord);
        }
      }
    }

    return savedRecords;
  },

  async handleOrderPaidTransition(order: Order): Promise<ProductDeliveryRecord[]> {
    const records = await this.syncDeliveryRecordsForOrder(order);
    const appBase = getPublicAppUrl();
    const firstToken = records[0]?.downloadToken || '';
    const deliveryPageUrl = `${appBase}/delivery/${encodeURIComponent(order.id)}${
      firstToken ? `?token=${encodeURIComponent(firstToken)}` : ''
    }`;
    const hasDownloads = records.some((r) => r.destinationType === 'digital_download');

    // Send automatic customer order confirmation & delivery email cleanly
    await emailService
      .notifyCustomerOrderDelivery({
        orderId: order.id,
        customerName: order.customerName,
        customerEmail: order.customerEmail,
        totalAmount: order.totalAmount,
        items: order.items,
        deliveryUrl: deliveryPageUrl,
        hasDownloads,
      })
      .then(async (res) => {
        if (res.sent) {
          await ProductDeliveryRecordModel.updateMany(
            { orderId: order.id, deliveryStatus: 'link_generated' },
            { $set: { deliveryStatus: 'delivered', updatedAt: new Date().toISOString() } }
          );
        }
      })
      .catch(console.error);

    // Send automatic Purchase Thank-You Email (atomically guarded against duplicate dispatch)
    await emailService.notifyCustomerPurchaseThankYou(order).catch(console.error);

    return records;
  },

  async getCustomerDeliveryBundle(
    orderId: string,
    verification?: { token?: string; email?: string }
  ): Promise<{
    paid: boolean;
    order: Pick<
      Order,
      'id' | 'customerName' | 'totalAmount' | 'paymentStatus' | 'fulfillmentStatus' | 'paymentMethod' | 'createdAt' | 'verifiedAt'
    >;
    headline: string;
    instructions: string;
    primaryDestination?: {
      type: DestinationType;
      url: string;
      whatsappMessage?: string;
    };
    items: ResolvedDestinationItem[];
  }> {
    requireDatabaseConnection();
    const order = await OrderModel.findOne({ id: orderId.trim() }).lean();
    if (!order) {
      throw new ApiError(404, 'Order not found.');
    }

    const settings = await cmsService.getSettings();
    const postCfg: PostPaymentConfig = {
      ...DEFAULT_POST_PAYMENT_CONFIG,
      ...(settings.postPaymentConfig || {}),
    };

    if (order.paymentStatus !== 'paid') {
      return {
        paid: false,
        order: {
          id: order.id,
          customerName: order.customerName,
          totalAmount: order.totalAmount,
          paymentStatus: order.paymentStatus,
          fulfillmentStatus: order.fulfillmentStatus,
          paymentMethod: order.paymentMethod,
          createdAt: order.createdAt,
          verifiedAt: order.verifiedAt,
        },
        headline: 'Payment Confirmation Pending',
        instructions:
          'Digital product links and post-payment access are unlocked automatically once your payment is verified as PAID.',
        items: [],
      };
    }

    let records: ProductDeliveryRecord[] = (
      await ProductDeliveryRecordModel.find({ orderId: order.id }).lean()
    ).map(({ _id, ...rest }) => rest as ProductDeliveryRecord);
    if (records.length === 0) {
      records = await this.syncDeliveryRecordsForOrder(order as Order);
    }

    // Require secret downloadToken OR matching customer email to access paid delivery items
    const providedToken = verification?.token?.trim();
    const providedEmail = verification?.email?.trim().toLowerCase();
    const tokenMatches = providedToken
      ? records.some((r) => r.downloadToken === providedToken)
      : false;
    const emailMatches = providedEmail
      ? providedEmail === order.customerEmail.trim().toLowerCase()
      : false;

    if (!tokenMatches && !emailMatches) {
      throw new ApiError(
        403,
        'Please verify your purchase email or open the secure delivery link sent to your email.'
      );
    }

    const products = await ProductModel.find({
      id: { $in: records.map((r) => r.productId) },
    }).lean();
    const productMap = new Map<string, Product>();
    for (const p of products) productMap.set(p.id, p as Product);

    const assetIds = records.map((r) => r.digitalAssetId).filter(Boolean) as string[];
    const assets = assetIds.length
      ? await DigitalAssetModel.find({ id: { $in: assetIds } }).lean()
      : [];
    const assetMap = new Map<string, DigitalAsset>();
    for (const a of assets) assetMap.set(a.id, a as DigitalAsset);

    const items: ResolvedDestinationItem[] = records.map((rec) => {
      const prod = productMap.get(rec.productId) || null;
      const asset = rec.digitalAssetId ? assetMap.get(rec.digitalAssetId) : undefined;
      const resolved = this.resolveSingleProductDestination({
        product: prod,
        order: order as Order,
        itemSummary: {
          productId: rec.productId,
          productName: rec.productName,
          duration: order.items.find((i) => i.productId === rec.productId)?.duration || '',
        },
        settings,
        downloadToken: rec.downloadToken,
      });

      const appBase = getPublicAppUrl();
      const accessUrl =
        resolved.destinationType === 'digital_download'
          ? `${appBase}/api/delivery/download/${encodeURIComponent(rec.downloadToken)}`
          : `${appBase}/api/delivery/redirect/${encodeURIComponent(rec.downloadToken)}`;

      return {
        productId: rec.productId,
        productName: rec.productName,
        duration: order.items.find((i) => i.productId === rec.productId)?.duration || '',
        destinationType: resolved.destinationType,
        destinationUrl: rec.downloadEnabled ? accessUrl : '',
        whatsappMessage: resolved.whatsappMessage,
        digitalAssetId: resolved.digitalAssetId,
        digitalFileName: asset?.originalFileName || rec.digitalFileName,
        digitalMimeType: asset?.mimeType,
        digitalFileSize: asset?.sizeBytes,
        downloadToken: rec.downloadToken,
        downloadEnabled: rec.downloadEnabled,
        downloadCount: rec.downloadCount,
        deliveryStatus: rec.deliveryStatus,
      };
    });

    const firstEnabled = items.find((it) => it.downloadEnabled);
    return {
      paid: true,
      order: {
        id: order.id,
        customerName: order.customerName,
        totalAmount: order.totalAmount,
        paymentStatus: order.paymentStatus,
        fulfillmentStatus: order.fulfillmentStatus,
        paymentMethod: order.paymentMethod,
        createdAt: order.createdAt,
        verifiedAt: order.verifiedAt,
      },
      headline: postCfg.downloadPageHeadline || 'Your Order Is Confirmed!',
      instructions:
        postCfg.downloadPageInstructions ||
        'Access your purchased software tools and digital deliverables below.',
      ...(firstEnabled
        ? {
            primaryDestination: {
              type: firstEnabled.destinationType,
              url: firstEnabled.destinationUrl,
              whatsappMessage: firstEnabled.whatsappMessage,
            },
          }
        : {}),
      items,
    };
  },

  async streamProtectedDownload(token: string, res: Response): Promise<void> {
    requireDatabaseConnection();
    const record = await ProductDeliveryRecordModel.findOne({ downloadToken: token.trim() }).lean();
    if (!record) {
      throw new ApiError(404, 'Download link is invalid.');
    }

    const order = await OrderModel.findOne({ id: record.orderId }).lean();
    if (!order || order.paymentStatus !== 'paid') {
      throw new ApiError(403, 'Payment confirmation is required before downloading this product.');
    }

    if (!record.downloadEnabled) {
      throw new ApiError(403, 'Download access for this order has been temporarily disabled by Admin.');
    }

    if (!record.digitalAssetId) {
      throw new ApiError(404, 'No digital file is currently attached to this product.');
    }

    const asset = await DigitalAssetModel.findOne({ id: record.digitalAssetId }).lean();
    if (!asset) {
      throw new ApiError(404, 'Digital asset file record no longer exists.');
    }

    const fullPath = path.join(DIGITAL_PRODUCTS_DIR, path.basename(asset.storedFileName));
    if (!fs.existsSync(fullPath)) {
      throw new ApiError(404, 'Digital product file is missing on server storage.');
    }

    const now = new Date().toISOString();
    await ProductDeliveryRecordModel.updateOne(
      { id: record.id },
      {
        $inc: { downloadCount: 1 },
        $set: {
          firstAccessedAt: record.firstAccessedAt || now,
          lastAccessedAt: now,
          deliveryStatus: 'downloaded',
          updatedAt: now,
        },
      }
    );

    const safeFileName = sanitizeDownloadFilename(asset.originalFileName);
    res.setHeader('Content-Type', asset.mimeType || 'application/octet-stream');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Security-Policy', "default-src 'none'; sandbox");
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${safeFileName}"; filename*=UTF-8''${encodeURIComponent(safeFileName)}`
    );
    res.setHeader('Content-Length', String(asset.sizeBytes));
    res.setHeader('Cache-Control', 'no-store');

    res.on('finish', () => {
      ProductDeliveryRecordModel.updateOne(
        { id: record.id },
        { $set: { lastCompletedAt: new Date().toISOString(), updatedAt: new Date().toISOString() } }
      ).catch(() => {});
    });

    const stream = fs.createReadStream(fullPath);
    stream.on('error', () => {
      if (!res.headersSent) {
        res.status(500).json({ success: false, error: 'Failed to stream digital file.' });
      } else {
        res.end();
      }
    });
    stream.pipe(res);
  },

  async trackAndResolveRedirect(token: string): Promise<string> {
    requireDatabaseConnection();
    const record = await ProductDeliveryRecordModel.findOne({ downloadToken: token.trim() }).lean();
    if (!record) {
      throw new ApiError(404, 'Delivery access link is invalid.');
    }

    const order = await OrderModel.findOne({ id: record.orderId }).lean();
    if (!order || order.paymentStatus !== 'paid') {
      throw new ApiError(403, 'Payment confirmation is required before accessing product delivery.');
    }

    if (!record.downloadEnabled) {
      throw new ApiError(403, 'Access for this order has been paused or revoked by Admin.');
    }

    const now = new Date().toISOString();
    await ProductDeliveryRecordModel.updateOne(
      { id: record.id },
      {
        $inc: { downloadCount: 1 },
        $set: {
          firstAccessedAt: record.firstAccessedAt || now,
          lastAccessedAt: now,
          lastCompletedAt: now,
          deliveryStatus: 'downloaded',
          updatedAt: now,
        },
      }
    );

    if (record.destinationType === 'digital_download') {
      return `${getPublicAppUrl()}/api/delivery/download/${encodeURIComponent(record.downloadToken)}`;
    }

    if (record.destinationUrl && isSafeHttpUrl(record.destinationUrl)) {
      return record.destinationUrl;
    }

    return getPublicAppUrl();
  },

  async listAdminDeliveryRecords(filters?: {
    search?: string;
    status?: string;
    destinationType?: string;
    productId?: string;
  }): Promise<ProductDeliveryRecord[]> {
    requireDatabaseConnection();
    // Ensure paid orders without records get synchronized first
    const paidOrders = await OrderModel.find({ paymentStatus: 'paid' }).sort({ createdAt: -1 }).limit(100).lean();
    const existingOrderIds = new Set(
      await ProductDeliveryRecordModel.distinct('orderId', {
        orderId: { $in: paidOrders.map((o) => o.id) },
      })
    );
    for (const po of paidOrders) {
      if (!existingOrderIds.has(po.id)) {
        await this.syncDeliveryRecordsForOrder(po as Order).catch(() => {});
      }
    }

    const query: Record<string, unknown> = {};
    if (filters?.status && filters.status !== 'all') {
      query.deliveryStatus = filters.status;
    }
    if (filters?.destinationType && filters.destinationType !== 'all') {
      query.destinationType = filters.destinationType;
    }
    if (filters?.productId && filters.productId !== 'all') {
      query.productId = filters.productId;
    }

    const docs = await ProductDeliveryRecordModel.find(query).sort({ updatedAt: -1 }).lean();
    let results = docs.map(({ _id, ...rest }) => rest as ProductDeliveryRecord);

    if (filters?.search?.trim()) {
      const q = filters.search.trim().toLowerCase();
      results = results.filter(
        (r) =>
          r.orderId.toLowerCase().includes(q) ||
          r.customerEmail.toLowerCase().includes(q) ||
          r.customerName.toLowerCase().includes(q) ||
          r.productName.toLowerCase().includes(q)
      );
    }

    return results;
  },

  async toggleDownloadPermission(recordId: string, enabled: boolean): Promise<ProductDeliveryRecord> {
    requireDatabaseConnection();
    const existing = await ProductDeliveryRecordModel.findOne({ id: recordId }).lean();
    if (!existing) throw new ApiError(404, 'Delivery record not found.');

    const nextStatus: ProductDeliveryRecord['deliveryStatus'] = !enabled
      ? 'revoked'
      : existing.paymentStatus !== 'paid'
      ? 'pending_payment'
      : existing.downloadCount > 0
      ? 'downloaded'
      : 'delivered';

    const updated = await ProductDeliveryRecordModel.findOneAndUpdate(
      { id: recordId },
      {
        $set: {
          downloadEnabled: enabled,
          deliveryStatus: nextStatus,
          updatedAt: new Date().toISOString(),
        },
      },
      { new: true }
    ).lean();

    await auditService.addLog(
      enabled ? 'Delivery Access Enabled' : 'Delivery Access Revoked',
      `Admin ${enabled ? 'enabled' : 'revoked'} product delivery for Order ${existing.orderId} (${existing.productName})`,
      'Admin'
    );

    const { _id, ...rest } = updated!;
    return rest as ProductDeliveryRecord;
  },

  async resendDeliveryInstructions(recordId: string) {
    requireDatabaseConnection();
    const record = await ProductDeliveryRecordModel.findOne({ id: recordId }).lean();
    if (!record) throw new ApiError(404, 'Delivery record not found.');

    const order = await OrderModel.findOne({ id: record.orderId }).lean();
    if (!order || order.paymentStatus !== 'paid') {
      throw new ApiError(400, 'Cannot send delivery instructions until payment is verified as paid.');
    }

    const deliveryUrl = `${getPublicAppUrl()}/delivery/${encodeURIComponent(order.id)}?token=${encodeURIComponent(
      record.downloadToken
    )}`;

    const mailRes = await emailService.notifyCustomerOrderDelivery({
      orderId: order.id,
      customerName: order.customerName,
      customerEmail: order.customerEmail,
      totalAmount: order.totalAmount,
      items: order.items,
      deliveryUrl,
      hasDownloads: record.destinationType === 'digital_download',
    });

    const now = new Date().toISOString();
    const updated = await ProductDeliveryRecordModel.findOneAndUpdate(
      { id: recordId },
      {
        $inc: { resentCount: 1 },
        $set: {
          lastResentAt: now,
          ...(record.deliveryStatus === 'link_generated' ? { deliveryStatus: 'delivered' } : {}),
          updatedAt: now,
        },
      },
      { new: true }
    ).lean();

    await auditService.addLog(
      'Delivery Instructions Resent',
      `Admin resent delivery access for Order ${order.id} to ${order.customerEmail} (sent: ${mailRes.sent})`,
      'Admin'
    );

    const { _id, ...rest } = updated!;
    return { record: rest as ProductDeliveryRecord, emailSent: mailRes.sent };
  },

  async getDeliveryReports() {
    const records = await this.listAdminDeliveryRecords();
    const paidRecords = records.filter((r) => r.paymentStatus === 'paid');
    const downloadedCount = paidRecords.filter((r) => r.downloadCount > 0).length;
    const totalDownloads = paidRecords.reduce((acc, r) => acc + (r.downloadCount || 0), 0);
    const revokedCount = paidRecords.filter((r) => !r.downloadEnabled).length;

    const byProduct = new Map<
      string,
      {
        productId: string;
        productName: string;
        paidOrders: number;
        accessedCount: number;
        totalDownloads: number;
        destinationType: DestinationType;
      }
    >();

    for (const r of paidRecords) {
      let row = byProduct.get(r.productId);
      if (!row) {
        row = {
          productId: r.productId,
          productName: r.productName,
          paidOrders: 0,
          accessedCount: 0,
          totalDownloads: 0,
          destinationType: r.destinationType,
        };
        byProduct.set(r.productId, row);
      }
      row.paidOrders++;
      if (r.downloadCount > 0) row.accessedCount++;
      row.totalDownloads += r.downloadCount || 0;
    }

    return {
      summary: {
        totalRecords: records.length,
        paidRecords: paidRecords.length,
        pendingAccess: paidRecords.filter((r) => r.downloadCount === 0 && r.downloadEnabled).length,
        accessedOrDownloaded: downloadedCount,
        totalDownloads,
        revokedCount,
        completionRate:
          paidRecords.length > 0 ? Math.round((downloadedCount / paidRecords.length) * 1000) / 10 : 0,
      },
      byProduct: Array.from(byProduct.values()).sort((a, b) => b.paidOrders - a.paidOrders),
    };
  },

  async exportDeliveryReportsCsv(): Promise<string> {
    const records = await this.listAdminDeliveryRecords();
    const esc = (v: unknown) => {
      const s = String(v ?? '');
      return s.includes(',') || s.includes('"') || s.includes('\n')
        ? `"${s.replace(/"/g, '""')}"`
        : s;
    };
    const headers = [
      'Order ID',
      'Product Name',
      'Customer Name',
      'Customer Email',
      'Payment Status',
      'Destination Type',
      'Delivery Status',
      'Download Enabled',
      'Download Count',
      'First Accessed',
      'Last Completed',
      'Created At',
    ];
    const rows = records.map((r) =>
      [
        r.orderId,
        r.productName,
        r.customerName,
        r.customerEmail,
        r.paymentStatus,
        r.destinationType,
        r.deliveryStatus,
        r.downloadEnabled ? 'Yes' : 'Revoked',
        r.downloadCount,
        r.firstAccessedAt || '',
        r.lastCompletedAt || '',
        r.createdAt,
      ]
        .map(esc)
        .join(',')
    );
    return [headers.join(','), ...rows].join('\n');
  },
};
