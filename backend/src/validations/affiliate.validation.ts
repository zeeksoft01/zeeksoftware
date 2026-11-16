import { z } from 'zod';

export const registerAffiliateSchema = z.object({
  body: z.object({
    fullName: z.string().trim().min(2, 'Full legal name is required'),
    email: z.string().trim().email('Valid email address is required'),
    phone: z.string().trim().min(6, 'Valid WhatsApp/phone number is required'),
    password: z.string().min(6, 'Password must be at least 6 characters').optional(),
    bankName: z.string().trim().min(2, 'Bank name is required'),
    accountNumber: z.string().trim().min(6, 'Valid account number is required'),
    accountName: z.string().trim().min(2, 'Account holder name is required'),
    profilePicture: z.string().optional(),
    marketingConsent: z.boolean().optional(),
  }),
});

export const affiliateLoginSchema = z.object({
  body: z.object({
    email: z.string().trim().email('Valid email address is required'),
    password: z.string().min(1, 'Password is required'),
  }),
});

export const trackReferralClickSchema = z.object({
  body: z.object({
    referralCode: z.string().trim().min(3, 'Referral code is required').max(40),
    targetPath: z
      .string()
      .trim()
      .max(300)
      .refine((v) => !v || v.startsWith('/'), 'targetPath must be a relative path starting with /')
      .optional(),
  }),
});

export const requestWithdrawalSchema = z.object({
  body: z.object({
    amount: z.number().positive('Withdrawal amount must be greater than zero'),
  }),
});

export const updateWithdrawalStatusSchema = z.object({
  params: z.object({
    withdrawalId: z.string().trim().min(1, 'Withdrawal ID is required'),
  }),
  body: z.object({
    status: z.enum([
      'Pending Review',
      'Approved',
      'Processing Payment',
      'Payment Sent',
      'Withdrawal Successful',
      'Declined',
    ]),
    transferReference: z.string().trim().optional(),
    rejectionReason: z.string().trim().optional(),
    adminNotes: z.string().trim().optional(),
    adminUser: z.string().trim().optional(),
  }),
});

export const adjustAffiliateBalanceSchema = z.object({
  params: z.object({
    affiliateId: z.string().trim().min(1, 'Affiliate ID is required'),
  }),
  body: z.object({
    type: z.enum(['credit', 'debit']),
    amount: z.number().positive('Amount must be greater than zero'),
    reason: z.string().trim().min(2, 'Reason is required'),
    adminUser: z.string().trim().optional(),
  }),
});
