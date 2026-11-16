import { z } from 'zod';

export const authRegisterSchema = z.object({
  body: z
    .object({
      fullName: z.string().trim().min(2, 'Full name is required'),
      email: z.string().trim().email('Valid email address is required'),
      phone: z.string().trim().optional().default(''),
      password: z.string().min(6, 'Password must be at least 6 characters'),
      role: z.enum(['affiliate', 'user']).optional().default('affiliate'),
      bankName: z.string().trim().optional(),
      accountNumber: z.string().trim().optional(),
      accountName: z.string().trim().optional(),
      profilePicture: z.string().optional(),
      marketingConsent: z.boolean().optional(),
    })
    .superRefine((data, ctx) => {
      if (data.role === 'user') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Standard user registration is not active yet. Please register via Become Affiliate.',
          path: ['role'],
        });
        return;
      }

      // Default role is 'affiliate'
      if (!data.phone || data.phone.trim().length < 6) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'WhatsApp / phone number is required for affiliate accounts',
          path: ['phone'],
        });
      }
      if (!data.bankName || data.bankName.trim().length < 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Bank name is required for affiliate payouts',
          path: ['bankName'],
        });
      }
      if (!data.accountNumber || data.accountNumber.trim().length < 6) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Valid bank account number is required for affiliate payouts',
          path: ['accountNumber'],
        });
      }
      if (!data.accountName || data.accountName.trim().length < 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Account holder name is required for affiliate payouts',
          path: ['accountName'],
        });
      }
    }),
});

export const authLoginSchema = z.object({
  body: z.object({
    email: z.string().trim().email('Valid email address is required').optional().or(z.literal('')),
    password: z.string().min(1, 'Password is required'),
  }),
});

export const becomeAffiliateSchema = z.object({
  body: z.object({
    phone: z.string().trim().optional(),
    bankName: z.string().trim().min(2, 'Bank name is required'),
    accountNumber: z.string().trim().min(6, 'Valid bank account number is required'),
    accountName: z.string().trim().min(2, 'Account holder name is required'),
  }),
});
