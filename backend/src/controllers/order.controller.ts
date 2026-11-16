import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/ApiError';
import { orderService } from '../services';
import { Order } from '../types';

const maskEmail = (email: string): string => {
  const [local, domain] = String(email || '').split('@');
  if (!domain) return '***';
  const prefix = local.slice(0, Math.min(2, local.length));
  return `${prefix}***@${domain}`;
};

const maskPhone = (phone: string): string => {
  const clean = String(phone || '').trim();
  if (clean.length <= 4) return '****';
  return `${clean.slice(0, 3)}****${clean.slice(-3)}`;
};

/**
 * Redacts internal admin/affiliate fields on public order responses.
 * For unverified direct ID lookups, also masks PII & activationCredentials.
 */
const sanitizeOrderResponse = (order: Order, includeCredentialsAndFullPii = false): Order => {
  const {
    affiliateId: _affiliateId,
    commissionAwarded: _commissionAwarded,
    commissionSkippedReason: _commissionSkippedReason,
    fulfillmentNotes: _fulfillmentNotes,
    verifiedBy: _verifiedBy,
    proofImage: _proofImage,
    ...rest
  } = order;

  if (includeCredentialsAndFullPii) {
    return {
      ...rest,
      customerWhatsApp: maskPhone(order.customerWhatsApp),
    };
  }

  return {
    ...rest,
    customerEmail: maskEmail(order.customerEmail),
    customerWhatsApp: maskPhone(order.customerWhatsApp),
    activationCredentials: undefined,
  };
};

export const orderController = {
  createOrder: asyncHandler(async (req: Request, res: Response) => {
    const order = await orderService.createOrder(req.body);
    res.status(201).json({
      success: true,
      order: sanitizeOrderResponse(order, true),
      message: 'Order created successfully with server-verified pricing.',
    });
  }),

  getOrderById: asyncHandler(async (req: Request, res: Response) => {
    const order = await orderService.getOrderById(req.params.orderId);
    if (!order) {
      throw new ApiError(404, 'Order not found');
    }
    res.json({ success: true, order: sanitizeOrderResponse(order, false) });
  }),

  lookupOrders: asyncHandler(async (req: Request, res: Response) => {
    const orders = await orderService.lookupOrders(req.body.query);
    res.json({
      success: true,
      orders: orders.map((o) => sanitizeOrderResponse(o, true)),
    });
  }),

  submitManualPayment: asyncHandler(async (req: Request, res: Response) => {
    const result = await orderService.submitManualPayment(req.params.orderId, req.body);
    res.json({
      success: true,
      order: sanitizeOrderResponse(result.order, true),
      whatsappUrl: result.whatsappUrl,
      whatsappMessage: result.whatsappMessage,
      message: 'Payment submitted for manual verification. Please notify support on WhatsApp.',
    });
  }),
};
