import { z } from 'zod';

export const toggleDeliveryAccessSchema = z.object({
  params: z.object({
    id: z.string().trim().min(1).max(120),
  }),
  body: z.object({
    enabled: z.boolean(),
  }),
});

export const deliveryIdParamSchema = z.object({
  params: z.object({
    id: z.string().trim().min(1).max(120),
  }),
});

export const deliveryTokenParamSchema = z.object({
  params: z.object({
    token: z.string().trim().min(10).max(160),
  }),
});

export const deliveryOrderParamSchema = z.object({
  params: z.object({
    orderId: z.string().trim().min(3).max(80),
  }),
});
