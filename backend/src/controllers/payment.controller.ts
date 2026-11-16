import crypto from 'crypto';
import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { env } from '../config/env';
import { orderService, paystackService } from '../services';

const resolveSafeAppBaseUrl = (req: Request): string => {
  if (env.appUrl && !env.appUrl.includes('MY_APP_URL')) {
    try {
      const parsed = new URL(env.appUrl);
      if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
        return env.appUrl.replace(/\/$/, '');
      }
    } catch {
      // Fall through to host validation
    }
  }

  const rawHost = (req.get('host') || '').trim();
  const safeHost = /^[a-zA-Z0-9.-]+(:\d{1,5})?$/.test(rawHost) ? rawHost : 'localhost:3000';
  const protocol =
    req.protocol === 'https' || req.get('x-forwarded-proto') === 'https' ? 'https' : 'http';
  return `${protocol}://${safeHost}`;
};

export const paymentController = {
  initializePaystack: asyncHandler(async (req: Request, res: Response) => {
    const { orderId } = req.body;
    const appBaseUrl = resolveSafeAppBaseUrl(req);
    const callbackUrl = `${appBaseUrl}/payment-verify?orderId=${encodeURIComponent(orderId)}`;
    const result = await paystackService.initializeTransaction(orderId, callbackUrl);
    res.json(result);
  }),

  verifyPaystack: asyncHandler(async (req: Request, res: Response) => {
    const result = await paystackService.verifyTransaction(req.params.reference);
    res.json(result);
  }),

  handlePaystackWebhook: asyncHandler(async (req: Request, res: Response) => {
    if (!paystackService.isKeyConfigured()) {
      res.status(503).send('Paystack gateway not configured');
      return;
    }

    const signature = (req.headers['x-paystack-signature'] as string) || '';
    const rawBody = Buffer.isBuffer(req.body)
      ? req.body.toString('utf-8')
      : JSON.stringify(req.body || {});

    // Verify signature using timing-safe comparison helper
    const expectedHash = crypto
      .createHmac('sha512', env.paystackSecretKey)
      .update(rawBody, 'utf8')
      .digest('hex');

    if (
      !signature ||
      !paystackService.verifyWebhookSignature(rawBody, signature) ||
      expectedHash.length !== signature.trim().length
    ) {
      res.status(401).send('Invalid signature');
      return;
    }

    let event: {
      event?: string;
      data?: {
        reference?: string;
        amount?: number;
        currency?: string;
        paid_at?: string;
        status?: string;
      };
    };

    try {
      event = JSON.parse(rawBody);
    } catch {
      res.status(400).send('Invalid webhook JSON');
      return;
    }

    if (event?.event === 'charge.success' && event?.data?.reference) {
      const reference = String(event.data.reference);
      const order = await orderService.getOrderById(reference);

      if (order && order.paymentStatus !== 'paid') {
        const expectedKobo = Math.round(order.totalAmount * 100);
        const currencyOk =
          !event.data.currency || String(event.data.currency).toUpperCase() === 'NGN';
        const amountOk =
          typeof event.data.amount === 'number' && event.data.amount >= expectedKobo;

        if (!currencyOk || !amountOk) {
          res.status(400).send('Webhook amount or currency mismatch');
          return;
        }

        await orderService.updateOrder(
          order.id,
          {
            paymentStatus: 'paid',
            fulfillmentStatus: 'Payment Confirmed',
            paymentReference: reference,
            verifiedAt: event.data.paid_at || new Date().toISOString(),
            verifiedBy: 'Paystack Webhook',
          },
          'Paystack Webhook'
        );
      }
    }

    res.status(200).send('Webhook processed');
  }),
};
