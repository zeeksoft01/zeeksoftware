import { z } from 'zod';

export const contactInquirySchema = z.object({
  body: z.object({
    fullName: z.string().trim().min(2, 'Full name is required'),
    email: z.string().trim().email('Valid email address is required'),
    whatsApp: z.string().trim().optional(),
    subject: z.string().trim().min(2, 'Subject is required'),
    message: z.string().trim().min(5, 'Message must be at least 5 characters'),
    marketingConsent: z.boolean().optional(),
  }),
});

export const submitReviewSchema = z.object({
  body: z.object({
    customerName: z.string().trim().min(2, 'Customer name is required'),
    rating: z.coerce.number().min(1).max(5),
    reviewMessage: z.string().trim().min(5, 'Review message is required'),
    productPurchased: z.string().trim().optional(),
    orderId: z.string().trim().optional(),
  }),
});
