import { z } from 'zod';

const USER_ROLES = ['affiliate', 'admin', 'user'] as const;
const USER_STATUSES = ['active', 'pending', 'suspended', 'disabled'] as const;

export const registerAdminSchema = z.object({
  body: z
    .object({
      fullName: z.string().trim().min(2).optional(),
      name: z.string().trim().min(2).optional(),
      email: z.string().trim().email('Valid email address is required'),
      phone: z.string().trim().optional(),
      password: z.string().min(6, 'Password must be at least 6 characters'),
      role: z.enum(USER_ROLES).optional().default('affiliate'),
      status: z.enum(USER_STATUSES).optional().default('active'),
      isVerified: z.boolean().optional().default(false),
      bankName: z.string().trim().optional(),
      accountNumber: z.string().trim().optional(),
      accountName: z.string().trim().optional(),
    })
    .refine((d) => Boolean(d.fullName?.trim() || d.name?.trim()), {
      message: 'Full name is required',
      path: ['fullName'],
    }),
});

export const updateAdminUserSchema = z.object({
  params: z.object({
    id: z.string().trim().min(1, 'User ID is required'),
  }),
  body: z
    .object({
      fullName: z.string().trim().min(2).optional(),
      name: z.string().trim().min(2).optional(),
      phone: z.string().trim().optional(),
      role: z.enum(USER_ROLES).optional(),
      status: z.enum(USER_STATUSES).optional(),
      isVerified: z.boolean().optional(),
      isActive: z.boolean().optional(),
      password: z.string().min(6, 'Password must be at least 6 characters').optional(),
      bankName: z.string().trim().optional(),
      accountNumber: z.string().trim().optional(),
      accountName: z.string().trim().optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: 'At least one field must be provided for update',
    }),
});

export const adminUserIdParamSchema = z.object({
  params: z.object({
    id: z.string().trim().min(1, 'User ID is required'),
  }),
});

export const uploadImageSchema = z.object({
  body: z.object({
    imageBase64: z.string().min(10, 'imageBase64 content is required'),
    fileName: z.string().optional(),
  }),
});

export const updateCmsSchema = z.object({
  params: z.object({
    section: z.enum(['slides', 'benefits', 'faqs', 'policies']),
  }),
  body: z.object({
    slides: z.array(z.record(z.string(), z.unknown())).optional(),
    benefits: z.array(z.record(z.string(), z.unknown())).optional(),
    faqs: z.array(z.record(z.string(), z.unknown())).optional(),
    policies: z.record(z.string(), z.unknown()).optional(),
  }),
});

export const updateReviewSchema = z.object({
  params: z.object({
    id: z.string().trim().min(1, 'Review ID is required'),
  }),
  body: z.object({
    isApproved: z.boolean().optional(),
    isFeatured: z.boolean().optional(),
    customerName: z.string().optional(),
    rating: z.number().min(1).max(5).optional(),
    reviewMessage: z.string().optional(),
  }),
});

export const updateExchangeRateSchema = z.object({
  body: z.object({
    usdNgnRate: z.number().positive('Dollar exchange rate must be greater than zero'),
    syncUsdtRate: z.boolean().optional().default(false),
  }),
});

export const replyInquirySchema = z.object({
  params: z.object({
    id: z.string().trim().min(1, 'Inquiry ID is required'),
  }),
  body: z.object({
    subject: z.string().trim().min(2, 'Email subject is required'),
    message: z.string().trim().min(2, 'Reply message is required'),
    status: z.enum(['New', 'Replied', 'Awaiting Response', 'Resolved']).optional(),
  }),
});

export const updateInquiryStatusSchema = z.object({
  params: z.object({
    id: z.string().trim().min(1, 'Inquiry ID is required'),
  }),
  body: z.object({
    status: z.enum(['New', 'Replied', 'Awaiting Response', 'Resolved']),
  }),
});

const safeOptionalUrlString = z.string().max(1000).optional();

export const updateSettingsSchema = z.object({
  body: z
    .object({
      storeName: z.string().trim().min(1).max(120).optional(),
      tagline: z.string().max(250).optional(),
      secondaryTagline: z.string().max(250).optional(),
      slogan: z.string().max(300).optional(),
      supportWhatsApp: z.string().max(40).optional(),
      internationalWhatsApp: z.string().max(40).optional(),
      supportEmail: z.string().trim().email().or(z.literal('')).optional(),
      telegramUsername: z.string().max(80).optional(),
      telegramChannelUrl: safeOptionalUrlString,
      whatsappCommunityUrl: safeOptionalUrlString,
      currency: z.string().max(10).optional(),
      logoUrl: z.string().optional(),
      lightLogoUrl: z.string().optional(),
      darkLogoUrl: z.string().optional(),
      faviconUrl: z.string().optional(),
      mobileIconUrl: z.string().optional(),
      logoWidth: z.number().min(10).max(1000).optional(),
      logoHeight: z.number().min(10).max(1000).optional(),
      socialShareImageUrl: z.string().optional(),
      bankName: z.string().max(120).optional(),
      accountNumber: z.string().max(50).optional(),
      accountName: z.string().max(120).optional(),
      usdtEnabled: z.boolean().optional(),
      usdtNetworks: z
        .array(
          z.object({
            network: z.string().trim().min(1).max(60),
            address: z.string().trim().min(1).max(200),
            memo: z.string().max(200).optional(),
          })
        )
        .max(20)
        .optional(),
      usdtNgnRate: z.number().positive().max(1_000_000).optional(),
      usdNgnRate: z.number().positive().max(1_000_000).optional(),
      bybitUid: z.string().max(80).optional(),
      bybitEnabled: z.boolean().optional(),
      binanceUid: z.string().max(80).optional(),
      binanceEnabled: z.boolean().optional(),
      paystackEnabled: z.boolean().optional(),
      paystackPublicKey: z.string().max(120).optional(),
      paystackMode: z.enum(['test', 'live']).optional(),
      announcementText: z.string().max(500).optional(),
      announcementActive: z.boolean().optional(),
      primaryColor: z.string().max(30).optional(),
      accentColor: z.string().max(30).optional(),
      heroAutoplayDuration: z.number().min(1000).max(60000).optional(),
      heroTransitionSpeed: z.number().min(100).max(5000).optional(),
      defaultCommissionRate: z.number().min(0).max(100).optional(),
      productCommissionRates: z.record(z.string(), z.number().min(0).max(100)).optional(),
      recurringCommissionsEnabled: z.boolean().optional(),
      minWithdrawalAmount: z.number().min(0).max(100_000_000).optional(),
      referralCookieDays: z.number().int().min(1).max(3650).optional(),
      affiliateGuide: z.record(z.string(), z.unknown()).optional(),
      postPaymentConfig: z
        .object({
          defaultDestinationType: z.enum(['whatsapp', 'custom_url', 'digital_download']).optional(),
          whatsappNumber: z.string().max(40).optional(),
          whatsappMessageTemplate: z.string().max(2000).optional(),
          customRedirectUrl: z.string().max(1000).optional(),
          downloadPageHeadline: z.string().max(200).optional(),
          downloadPageInstructions: z.string().max(2000).optional(),
        })
        .optional(),
      emailBranding: z
        .object({
          websiteUrl: z.string().max(300).optional(),
          footerNote: z.string().max(1000).optional(),
          facebookUrl: z.string().max(300).optional(),
          instagramUrl: z.string().max(300).optional(),
          twitterUrl: z.string().max(300).optional(),
          youtubeUrl: z.string().max(300).optional(),
          batchSize: z.number().int().min(1).max(500).optional(),
          batchDelayMs: z.number().int().min(50).max(60000).optional(),
          dailySendLimit: z.number().int().min(1).max(100_000).optional(),
          orderConfirmationSubject: z.string().max(250).optional(),
          orderConfirmationIntro: z.string().max(2000).optional(),
          thankYouEnabled: z.boolean().optional(),
          thankYouSubject: z.string().max(250).optional(),
          thankYouGreeting: z.string().max(250).optional(),
          thankYouBodyHtml: z.string().max(50000).optional(),
          thankYouWhatsappBtnLabel: z.string().max(120).optional(),
          thankYouTelegramBtnLabel: z.string().max(120).optional(),
        })
        .optional(),
    })
    .strip(),
});

