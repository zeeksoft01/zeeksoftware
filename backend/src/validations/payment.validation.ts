import { z } from 'zod';

export const initializePaystackSchema = z.object({
  body: z.object({
    orderId: z.string().trim().min(1, 'orderId is required'),
  }),
});

export const verifyPaystackSchema = z.object({
  params: z.object({
    reference: z.string().trim().min(1, 'Transaction reference is required'),
  }),
});
