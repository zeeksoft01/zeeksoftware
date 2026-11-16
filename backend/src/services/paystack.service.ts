import { env } from '../config/env';
import { ApiError } from '../utils/ApiError';
import { safeTimingEqual } from '../utils/security';
import { orderService } from './order.service';

interface PaystackInitResponse {
  status: boolean;
  message: string;
  data?: {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
}

interface PaystackVerifyResponse {
  status: boolean;
  message: string;
  data?: {
    status: string;
    reference: string;
    amount: number;
    currency: string;
    channel: string;
    paid_at: string;
    customer?: { email: string };
    metadata?: Record<string, unknown>;
  };
}

export const paystackService = {
  isKeyConfigured(): boolean {
    const key = env.paystackSecretKey;
    return Boolean(
      key &&
        !key.includes('your_secret_key_here') &&
        (key.startsWith('sk_test_') || key.startsWith('sk_live_'))
    );
  },

  isSimulationAllowed(): boolean {
    if (this.isKeyConfigured()) return false;
    if (env.isProduction || env.paystackMode === 'live') return false;
    return true;
  },

  async initializeTransaction(orderId: string, callbackUrl: string) {
    const order = await orderService.getOrderById(orderId);
    if (!order) {
      throw new ApiError(404, `Order ${orderId} not found`);
    }
    if (order.paymentStatus === 'paid') {
      throw new ApiError(400, `Order ${orderId} is already paid and verified.`);
    }

    const amountInKobo = Math.round(order.totalAmount * 100);
    if (amountInKobo <= 0) {
      throw new ApiError(400, 'Order amount must be greater than zero.');
    }

    const reference = `${orderId}_${Date.now()}`;

    await orderService.updateOrder(orderId, {
      paymentReference: reference,
      paymentMethod: 'Paystack',
    });

    if (this.isKeyConfigured()) {
      const response = await fetch('https://api.paystack.co/transaction/initialize', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.paystackSecretKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: order.customerEmail,
          amount: amountInKobo,
          reference,
          callback_url: callbackUrl,
          metadata: {
            orderId: order.id,
            customerName: order.customerName,
            customerWhatsApp: order.customerWhatsApp,
            items: order.items.map((i) => `${i.productName} (${i.duration})`).join(', '),
          },
        }),
      });

      const data = (await response.json()) as PaystackInitResponse;
      if (!data.status || !data.data) {
        throw new ApiError(502, data.message || 'Failed to initialize Paystack transaction');
      }

      return {
        status: true,
        authorizationUrl: data.data.authorization_url,
        accessCode: data.data.access_code,
        reference: data.data.reference,
        mode: env.paystackSecretKey.startsWith('sk_live_') ? 'live' : 'test',
      };
    }

    if (!this.isSimulationAllowed()) {
      throw new ApiError(
        503,
        'Paystack payment gateway is not configured on the server. Please configure PAYSTACK_SECRET_KEY or choose another payment method.'
      );
    }

    return {
      status: true,
      authorizationUrl: `/paystack-test-checkout?reference=${encodeURIComponent(
        reference
      )}&amount=${order.totalAmount}&orderId=${encodeURIComponent(order.id)}`,
      accessCode: `TEST_CODE_${Date.now()}`,
      reference,
      mode: 'test_simulation',
      note: 'Development Paystack sandbox active. Configure PAYSTACK_SECRET_KEY for live verification.',
    };
  },

  async verifyTransaction(reference: string) {
    const order = await orderService.getOrderById(reference);
    if (!order) {
      throw new ApiError(404, `No order associated with transaction reference: ${reference}`);
    }

    if (order.paymentStatus === 'paid') {
      return {
        status: true,
        alreadyProcessed: true,
        order,
        message: 'Order is already marked as paid.',
      };
    }

    if (this.isKeyConfigured()) {
      const response = await fetch(
        `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${env.paystackSecretKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const data = (await response.json()) as PaystackVerifyResponse;
      if (!data.status || !data.data) {
        throw new ApiError(400, data.message || 'Transaction verification failed');
      }

      const tx = data.data;
      if (tx.status !== 'success') {
        return {
          status: false,
          paymentStatus: tx.status,
          message: `Payment status is ${tx.status}`,
        };
      }

      if (tx.reference && tx.reference !== reference) {
        throw new ApiError(400, 'Verified transaction reference mismatch.');
      }

      if (tx.currency && tx.currency.toUpperCase() !== 'NGN') {
        throw new ApiError(400, `Unexpected transaction currency: ${tx.currency}`);
      }

      const expectedKobo = Math.round(order.totalAmount * 100);
      if (typeof tx.amount !== 'number' || tx.amount < expectedKobo) {
        throw new ApiError(
          400,
          `Paid amount (${Number(tx.amount || 0) / 100} NGN) is less than required (${order.totalAmount} NGN)`
        );
      }

      const updatedOrder = await orderService.updateOrder(
        order.id,
        {
          paymentStatus: 'paid',
          fulfillmentStatus: 'Payment Confirmed',
          paymentReference: reference,
          verifiedAt: tx.paid_at || new Date().toISOString(),
          verifiedBy: 'Paystack Automated Verification',
        },
        'Paystack Automated Verification'
      );

      return {
        status: true,
        order: updatedOrder,
        channel: tx.channel,
        verifiedAt: tx.paid_at,
      };
    }

    if (!this.isSimulationAllowed()) {
      throw new ApiError(
        503,
        'Paystack payment verification is unavailable because PAYSTACK_SECRET_KEY is not configured.'
      );
    }

    // Even in non-production simulation, require an initialized Paystack session reference
    if (order.paymentMethod !== 'Paystack' || order.paymentReference !== reference) {
      throw new ApiError(
        400,
        'Invalid simulated Paystack reference. Please initialize Paystack checkout first.'
      );
    }

    const updatedOrder = await orderService.updateOrder(
      order.id,
      {
        paymentStatus: 'paid',
        fulfillmentStatus: 'Payment Confirmed',
        paymentReference: reference,
        verifiedAt: new Date().toISOString(),
        verifiedBy: 'Paystack Test Simulation',
      },
      'Paystack Test Simulation'
    );

    return {
      status: true,
      order: updatedOrder,
      channel: 'test_card',
      verifiedAt: new Date().toISOString(),
    };
  },

  verifyWebhookSignature(payload: string, signature: string): boolean {
    if (!this.isKeyConfigured() || !payload || !signature) return false;
    const crypto = require('crypto') as typeof import('crypto');
    const hash = crypto
      .createHmac('sha512', env.paystackSecretKey)
      .update(payload, 'utf8')
      .digest('hex');
    return safeTimingEqual(hash.toLowerCase(), signature.trim().toLowerCase());
  },
};
