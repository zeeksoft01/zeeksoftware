import { z } from 'zod';

const paymentMethodEnum = z.enum([
  'Paystack',
  'Direct Bank Transfer',
  'USDT',
  'Bybit',
  'Binance',
]);

export const createOrderSchema = z.object({
  body: z.object({
    customerName: z.string().trim().min(2, 'Customer name is required'),
    customerEmail: z.string().trim().email('Valid email address is required'),
    customerWhatsApp: z.string().trim().min(6, 'Valid WhatsApp number is required'),
    items: z
      .array(
        z.object({
          productId: z.string().trim().min(1, 'Product ID is required'),
          quantity: z.number().int().min(1).max(100).default(1),
        })
      )
      .min(1, 'At least one item is required'),
    paymentMethod: paymentMethodEnum.optional().default('Paystack'),
    proofNote: z.string().optional(),
    referralCode: z.string().trim().optional(),
    marketingConsent: z.boolean().optional(),
  }),
});

export const orderIdParamSchema = z.object({
  params: z.object({
    orderId: z.string().trim().min(1, 'Order ID is required'),
  }),
});

export const lookupOrdersSchema = z.object({
  body: z.object({
    query: z.string().trim().min(2, 'Search query is required'),
  }),
});

export const manualPaymentSchema = z.object({
  params: z.object({
    orderId: z.string().trim().min(1, 'Order ID is required'),
  }),
  body: z.object({
    paymentMethod: paymentMethodEnum.optional(),
    transactionReference: z.string().trim().optional(),
    transactionHash: z.string().trim().optional(),
    proofNote: z.string().trim().optional(),
    proofImage: z.string().optional(),
  }),
});

export const updateAdminOrderSchema = z.object({
  params: z.object({
    orderId: z.string().trim().min(1, 'Order ID is required'),
  }),
  body: z.object({
    paymentStatus: z
      .enum(['pending', 'awaiting_verification', 'paid', 'failed', 'refunded'])
      .optional(),
    fulfillmentStatus: z
      .enum([
        'Awaiting Payment',
        'Payment Submitted',
        'Payment Confirmed',
        'Awaiting Fulfillment',
        'Processing',
        'Delivered',
        'Activation Completed',
        'Support Required',
        'Refunded',
        'Cancelled',
      ])
      .optional(),
    paymentReference: z.string().optional(),
    transactionHash: z.string().optional(),
    proofNote: z.string().optional(),
    fulfillmentNotes: z.string().optional(),
    activationCredentials: z.string().optional(),
    adminUser: z.string().optional(),
  }),
});
