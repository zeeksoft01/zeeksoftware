import { Order, OrderItem, PaymentMethod } from '../types';
import { AffiliateCommissionModel, OrderModel, ReferralAttributionModel } from '../models';
import { requireDatabaseConnection } from '../config/database';
import { ApiError } from '../utils/ApiError';
import { cryptoRandomHex, escapeRegExp } from '../utils/security';
import { productService } from './product.service';
import { affiliateService } from './affiliate.service';
import { auditService } from './audit.service';
import { cmsService } from './cms.service';
import { uploadService } from './upload.service';
import { emailContactService } from './emailContact.service';
import { deliveryService } from './delivery.service';

export const orderService = {
  async generateUniqueOrderId(): Promise<string> {
    let candidate = `ZEEK-ORD-${cryptoRandomHex(4)}`;
    while (await OrderModel.exists({ id: candidate })) {
      candidate = `ZEEK-ORD-${cryptoRandomHex(4)}`;
    }
    return candidate;
  },

  async createOrder(orderData: {
    customerName: string;
    customerEmail: string;
    customerWhatsApp: string;
    items: Array<{ productId: string; quantity: number }>;
    paymentMethod?: PaymentMethod;
    proofNote?: string;
    referralCode?: string;
    marketingConsent?: boolean;
  }): Promise<Order> {
    requireDatabaseConnection();
    const validatedItems: OrderItem[] = [];
    let calculatedTotal = 0;

    for (const reqItem of orderData.items) {
      const dbProduct = await productService.getProductById(reqItem.productId);
      if (!dbProduct) {
        throw new ApiError(404, `Product with ID ${reqItem.productId} not found`);
      }
      const qty = Math.max(1, reqItem.quantity || 1);
      calculatedTotal += dbProduct.price * qty;
      validatedItems.push({
        productId: dbProduct.id,
        productName: dbProduct.name,
        duration: dbProduct.duration,
        price: dbProduct.price,
        quantity: qty,
        category: dbProduct.category,
      });
    }

    const orderId = await this.generateUniqueOrderId();
    const normalizedEmail = orderData.customerEmail.trim().toLowerCase();
    const now = new Date().toISOString();

    let linkedAffiliateId: string | undefined;
    let validReferralCode: string | undefined;

    // 1. Check persistent customer -> original affiliate attribution
    let attribution = await ReferralAttributionModel.findOne({ customerEmail: normalizedEmail }).lean();

    // Backward-compatible backfill if customer previously ordered via an affiliate before ReferralAttribution existed
    if (!attribution) {
      const historicalReferredOrder = await OrderModel.findOne({
        customerEmail: normalizedEmail,
        affiliateId: { $exists: true, $nin: [null, ''] },
      })
        .sort({ createdAt: 1 })
        .lean();

      if (historicalReferredOrder?.affiliateId && historicalReferredOrder.referralCode) {
        const historicalAffOrders = await OrderModel.find({
          customerEmail: normalizedEmail,
          affiliateId: historicalReferredOrder.affiliateId,
        }).lean();
        const historicalOrderIds = historicalAffOrders.map((o) => o.id);
        const priorComm = await AffiliateCommissionModel.findOne({
          orderId: { $in: historicalOrderIds },
        })
          .sort({ createdAt: 1 })
          .lean();

        try {
          attribution = await ReferralAttributionModel.create({
            id: `attr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            customerEmail: normalizedEmail,
            customerName: historicalReferredOrder.customerName,
            customerWhatsApp: historicalReferredOrder.customerWhatsApp,
            affiliateId: historicalReferredOrder.affiliateId,
            referralCode: historicalReferredOrder.referralCode,
            firstOrderId: historicalReferredOrder.id,
            firstCommissionOrderId: priorComm?.orderId,
            firstPurchaseCompleted: Boolean(priorComm),
            totalOrdersCount: historicalAffOrders.length,
            totalCommissionedOrdersCount: priorComm ? 1 : 0,
            lastOrderId: historicalAffOrders[historicalAffOrders.length - 1]?.id,
            createdAt: historicalReferredOrder.createdAt || now,
            updatedAt: now,
          });
        } catch {
          attribution = await ReferralAttributionModel.findOne({ customerEmail: normalizedEmail }).lean();
        }
      }
    }

    if (attribution) {
      // Maintain original referrer relationship across subsequent visits & products
      const originalAffiliate = await affiliateService.getAffiliateById(attribution.affiliateId);
      if (
        originalAffiliate &&
        originalAffiliate.status === 'active' &&
        originalAffiliate.email.trim().toLowerCase() !== normalizedEmail
      ) {
        linkedAffiliateId = originalAffiliate._id;
        validReferralCode = originalAffiliate.referralCode;
        await ReferralAttributionModel.updateOne(
          { customerEmail: normalizedEmail },
          {
            $inc: { totalOrdersCount: 1 },
            $set: {
              lastOrderId: orderId,
              customerName: orderData.customerName.trim(),
              customerWhatsApp: orderData.customerWhatsApp.trim(),
              updatedAt: now,
            },
          }
        );
      }
    } else if (orderData.referralCode) {
      // First-time referred customer: bind permanently to this original referrer (excluding self-referrals)
      const aff = await affiliateService.getAffiliateByReferralCode(orderData.referralCode);
      if (
        aff &&
        aff.status === 'active' &&
        aff.email.trim().toLowerCase() !== normalizedEmail
      ) {
        linkedAffiliateId = aff._id;
        validReferralCode = aff.referralCode;
        await ReferralAttributionModel.updateOne(
          { customerEmail: normalizedEmail },
          {
            $setOnInsert: {
              id: `attr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
              customerEmail: normalizedEmail,
              affiliateId: aff._id,
              referralCode: aff.referralCode,
              firstOrderId: orderId,
              firstPurchaseCompleted: false,
              totalCommissionedOrdersCount: 0,
              createdAt: now,
            },
            $inc: { totalOrdersCount: 1 },
            $set: {
              customerName: orderData.customerName.trim(),
              customerWhatsApp: orderData.customerWhatsApp.trim(),
              lastOrderId: orderId,
              updatedAt: now,
            },
          },
          { upsert: true }
        );
      }
    }

    const newOrder: Order = {
      id: orderId,
      customerName: orderData.customerName.trim(),
      customerEmail: normalizedEmail,
      customerWhatsApp: orderData.customerWhatsApp.trim(),
      items: validatedItems,
      totalAmount: calculatedTotal,
      paymentMethod: orderData.paymentMethod || 'Paystack',
      paymentStatus: 'pending',
      fulfillmentStatus: 'Awaiting Payment',
      proofNote: orderData.proofNote,
      referralCode: validReferralCode,
      affiliateId: linkedAffiliateId,
      commissionAwarded: false,
      createdAt: now,
      updatedAt: now,
    };

    await OrderModel.create(newOrder);

    await Promise.all([
      emailContactService.recordOrderCheckout(newOrder, orderData.marketingConsent).catch(console.error),
      deliveryService.syncDeliveryRecordsForOrder(newOrder).catch(console.error),
    ]);

    return newOrder;
  },

  async getOrderById(idOrRef: string): Promise<Order | null> {
    requireDatabaseConnection();
    const doc = await OrderModel.findOne({
      $or: [{ id: idOrRef }, { paymentReference: idOrRef }],
    }).lean();
    if (!doc) return null;
    const { _id, ...rest } = doc;
    return rest as Order;
  },

  async lookupOrders(query: string): Promise<Order[]> {
    requireDatabaseConnection();
    const q = query.trim().toLowerCase();
    if (!q || q.length < 5) return [];

    const escaped = escapeRegExp(q);
    const conditions: Record<string, unknown>[] = [
      { id: new RegExp(`^${escaped}$`, 'i') },
      { customerEmail: new RegExp(`^${escaped}$`, 'i') },
      { paymentReference: new RegExp(`^${escaped}$`, 'i') },
    ];

    const digits = q.replace(/\D/g, '');
    const nonPhoneChars = q.replace(/[\d\s+()-]/g, '');
    if (digits.length >= 8 && nonPhoneChars.length === 0) {
      const tailDigits = digits.slice(-10);
      conditions.push({ customerWhatsApp: new RegExp(`${escapeRegExp(tailDigits)}$`) });
    }

    const docs = await OrderModel.find({ $or: conditions })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();
    return docs.map(({ _id, ...rest }) => rest as Order);
  },

  async getOrders(status?: string): Promise<Order[]> {
    requireDatabaseConnection();
    if (status && status !== 'all') {
      const docs = await OrderModel.find({
        $or: [
          { paymentStatus: status as Order['paymentStatus'] },
          { fulfillmentStatus: status as Order['fulfillmentStatus'] },
        ],
      })
        .sort({ createdAt: -1 })
        .lean();
      return docs.map(({ _id, ...rest }) => rest as Order);
    }
    const docs = await OrderModel.find().sort({ createdAt: -1 }).lean();
    return docs.map(({ _id, ...rest }) => rest as Order);
  },

  async updateOrder(id: string, updates: Partial<Order>, adminUser?: string): Promise<Order | null> {
    requireDatabaseConnection();
    const existing = await this.getOrderById(id);
    if (!existing) return null;

    const previousStatus = existing.paymentStatus;
    const previousFulfillment = existing.fulfillmentStatus;
    const now = new Date().toISOString();

    const finalUpdates: Partial<Order> = {
      ...updates,
      updatedAt: now,
    };

    if (adminUser && updates.paymentStatus === 'paid' && previousStatus !== 'paid') {
      finalUpdates.verifiedBy = updates.verifiedBy || adminUser;
      finalUpdates.verifiedAt = updates.verifiedAt || now;
    }

    const doc = await OrderModel.findOneAndUpdate(
      { id: existing.id },
      { $set: finalUpdates },
      { new: true }
    ).lean();
    const { _id, ...rest } = doc!;
    const updatedOrder = rest as Order;

    if (adminUser && updates.paymentStatus === 'paid' && previousStatus !== 'paid') {
      await auditService.addLog(
        'Verify Payment',
        `Admin ${adminUser} verified order ${existing.id} for ₦${updatedOrder.totalAmount}`,
        adminUser
      );
    }

    if (updates.fulfillmentStatus && updates.fulfillmentStatus !== previousFulfillment) {
      await auditService.addLog(
        'Fulfillment Update',
        `Order ${existing.id} status updated to: ${updates.fulfillmentStatus}`,
        adminUser || 'System'
      );
    }

    if (updatedOrder.paymentStatus === 'paid' && previousStatus !== 'paid') {
      await Promise.all([
        emailContactService.recordPurchaseCompletion(updatedOrder).catch(console.error),
        deliveryService.handleOrderPaidTransition(updatedOrder).catch(console.error),
      ]);
    }

    if (updatedOrder.paymentStatus === 'paid' && !updatedOrder.commissionAwarded) {
      await affiliateService.awardAffiliateCommission(updatedOrder);
      const refreshed = await this.getOrderById(updatedOrder.id);
      if (refreshed) return refreshed;
    }

    return updatedOrder;
  },

  async submitManualPayment(
    orderId: string,
    payload: {
      paymentMethod?: PaymentMethod;
      transactionReference?: string;
      transactionHash?: string;
      proofNote?: string;
      proofImage?: string;
    }
  ) {
    requireDatabaseConnection();
    const order = await this.getOrderById(orderId);
    if (!order) {
      throw new ApiError(404, 'Order not found');
    }
    if (order.paymentStatus === 'paid' || order.paymentStatus === 'refunded') {
      throw new ApiError(
        400,
        `Cannot submit manual payment because this order is already ${order.paymentStatus}.`
      );
    }

    const resolvedProofImage = payload.proofImage
      ? await uploadService.resolveCloudinaryImageUrl(payload.proofImage, {
          fileName: `proof-${orderId}`,
          folder: 'payment-proofs',
        })
      : order.proofImage;

    const updated = await this.updateOrder(orderId, {
      paymentMethod: payload.paymentMethod || order.paymentMethod,
      paymentStatus: 'awaiting_verification',
      fulfillmentStatus: 'Payment Submitted',
      paymentReference: payload.transactionReference || order.paymentReference,
      transactionHash: payload.transactionHash || order.transactionHash,
      proofNote: payload.proofNote || order.proofNote,
      proofImage: resolvedProofImage,
    });

    const settings = await cmsService.getSettings();
    const cleanWhatsApp = settings.internationalWhatsApp.replace(/\D/g, '');
    const primaryProduct = order.items[0]?.productName || 'Digital Subscription';
    const primaryDuration = order.items[0]?.duration || 'Selected Plan';
    const amountFormatted = order.totalAmount.toLocaleString('en-NG');

    const whatsappMessage =
      `Hello Zeek Softwares,\n\n` +
      `I have submitted payment for the following order:\n\n` +
      `Product: ${primaryProduct}\n` +
      `Plan Duration: ${primaryDuration}\n` +
      `Amount: ₦${amountFormatted}\n` +
      `Order ID: ${order.id}\n` +
      `Payment Method: ${payload.paymentMethod || order.paymentMethod}\n` +
      `Transaction Reference: ${payload.transactionReference || payload.transactionHash || 'Attached via WhatsApp'}\n` +
      `Payment Status: Awaiting Verification\n\n` +
      `Please help verify my payment and provide the next steps for activation.\n\n` +
      `Thank you.`;

    const whatsappUrl = `https://wa.me/${cleanWhatsApp}?text=${encodeURIComponent(whatsappMessage)}`;

    return {
      order: updated!,
      whatsappUrl,
      whatsappMessage,
    };
  },
};
