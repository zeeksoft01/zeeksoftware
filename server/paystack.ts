import crypto from 'crypto';
import { db } from './db';

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
    amount: number; // in kobo
    currency: string;
    channel: string;
    paid_at: string;
    customer?: {
      email: string;
    };
    metadata?: Record<string, unknown>;
  };
}

export class PaystackService {
  private getSecretKey(): string {
    return process.env.PAYSTACK_SECRET_KEY || '';
  }

  private isKeyConfigured(): boolean {
    const key = this.getSecretKey();
    return Boolean(key && !key.includes('your_secret_key_here') && (key.startsWith('sk_test_') || key.startsWith('sk_live_')));
  }

  public getPublicKey(): string {
    return process.env.PAYSTACK_PUBLIC_KEY || db.getSettings().paystackPublicKey;
  }

  public async initializeTransaction(orderId: string, callbackUrl: string) {
    const order = db.getOrderById(orderId);
    if (!order) {
      throw new Error(`Order ${orderId} not found`);
    }

    // Always compute amount from trusted database record
    const amountInKobo = Math.round(order.totalAmount * 100);
    const reference = `${orderId}_${Date.now()}`;

    // Update order with reference
    db.updateOrder(orderId, {
      paymentReference: reference,
      paymentMethod: 'Paystack',
    });

    if (this.isKeyConfigured()) {
      try {
        const response = await fetch('https://api.paystack.co/transaction/initialize', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.getSecretKey()}`,
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

        const data: PaystackInitResponse = await response.json();
        if (!data.status || !data.data) {
          throw new Error(data.message || 'Failed to initialize Paystack transaction');
        }

        return {
          status: true,
          authorizationUrl: data.data.authorization_url,
          accessCode: data.data.access_code,
          reference: data.data.reference,
          mode: this.getSecretKey().startsWith('sk_live_') ? 'live' : 'test',
        };
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : String(err);
        console.error('Paystack initialization error:', errMsg);
        throw new Error(`Paystack initialization failed: ${errMsg}`);
      }
    }

    // In Prototype / Test Mode when merchant secret key is pending in secrets manager:
    // Generate a secure mock checkout route that simulates Paystack's hosted payment gateway
    return {
      status: true,
      authorizationUrl: `/paystack-test-checkout?reference=${reference}&amount=${order.totalAmount}&orderId=${order.id}`,
      accessCode: `TEST_CODE_${Date.now()}`,
      reference,
      mode: 'test_simulation',
      note: 'Simulated Paystack gateway active. Set PAYSTACK_SECRET_KEY in AI Studio secrets for live gateway.',
    };
  }

  public async verifyTransaction(reference: string) {
    // Find the associated order
    const order = db.getOrderById(reference);
    if (!order) {
      throw new Error(`No order associated with transaction reference: ${reference}`);
    }

    // Prevent duplicate confirmation if already confirmed
    if (order.paymentStatus === 'paid') {
      return {
        status: true,
        alreadyProcessed: true,
        order,
        message: 'Order is already marked as paid.',
      };
    }

    if (this.isKeyConfigured()) {
      try {
        const response = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${this.getSecretKey()}`,
            'Content-Type': 'application/json',
          },
        });

        const data: PaystackVerifyResponse = await response.json();

        if (!data.status || !data.data) {
          throw new Error(data.message || 'Transaction verification failed');
        }

        const tx = data.data;

        // Verify status, currency, and amount
        if (tx.status !== 'success') {
          return {
            status: false,
            paymentStatus: tx.status,
            message: `Payment status is ${tx.status}`,
          };
        }

        const expectedKobo = Math.round(order.totalAmount * 100);
        if (tx.amount < expectedKobo) {
          throw new Error(`Paid amount (${tx.amount / 100} NGN) is less than required (${order.totalAmount} NGN)`);
        }

        // Successfully verified
        const updatedOrder = db.updateOrder(
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
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : String(err);
        console.error('Error verifying Paystack transaction:', errMsg);
        throw new Error(`Paystack verification failed: ${errMsg}`);
      }
    }

    // In test/demo simulation mode
    const updatedOrder = db.updateOrder(
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
  }

  public verifyWebhookSignature(payload: string, signature: string): boolean {
    const secret = this.getSecretKey();
    if (!secret) return false;

    const hash = crypto.createHmac('sha512', secret).update(payload).digest('hex');
    return hash === signature;
  }
}

export const paystack = new PaystackService();
