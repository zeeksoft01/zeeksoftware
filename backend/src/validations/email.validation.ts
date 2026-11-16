import { z } from 'zod';

const CONSENT_STATUSES = ['subscribed', 'unsubscribed', 'pending'] as const;
const TARGET_TYPES = [
  'all_contacts',
  'categories',
  'individual',
  'product_buyers',
  'repeat_customers',
  'new_customers',
  'inactive_users',
  'never_purchased',
] as const;

export const updateEmailPreferencesSchema = z.object({
  params: z.object({
    token: z.string().trim().min(8).max(160),
  }),
  body: z.object({
    action: z.enum(['unsubscribe', 'resubscribe']),
    reason: z.string().trim().max(500).optional(),
  }),
});

export const addEmailContactSchema = z.object({
  body: z.object({
    email: z.string().trim().email('Valid email address is required'),
    fullName: z.string().trim().max(150).optional(),
    whatsApp: z.string().trim().max(40).optional(),
    categories: z.array(z.string().trim().max(80)).max(20).optional(),
    marketingConsent: z.enum(CONSENT_STATUSES).optional(),
    notes: z.string().max(1000).optional(),
  }),
});

export const bulkImportContactsSchema = z.object({
  body: z.object({
    rawText: z.string().min(3, 'Please provide email addresses to import').max(2_000_000),
    source: z.enum(['csv_import', 'paste_import']).optional().default('paste_import'),
    categories: z.array(z.string().trim().max(80)).max(20).optional(),
    hasPermissionToEmail: z.boolean().optional(),
    fileName: z.string().trim().max(200).optional(),
  }),
});

export const importMappedCsvSchema = z.object({
  body: z.object({
    contacts: z
      .array(
        z.object({
          email: z.string().max(254).optional(),
          firstName: z.string().max(120).optional(),
          lastName: z.string().max(120).optional(),
          fullName: z.string().max(200).optional(),
          whatsApp: z.string().max(40).optional(),
          notes: z.string().max(1000).optional(),
        })
      )
      .min(1, 'At least one contact row is required')
      .max(5000, 'Maximum 5,000 rows allowed per CSV batch'),
    fileName: z.string().trim().max(200).optional(),
    duplicateMode: z.enum(['skip', 'update']).optional(),
    categories: z.array(z.string().trim().max(80)).max(20).optional(),
    hasPermissionToEmail: z.boolean().optional(),
  }),
});

export const updateEmailContactSchema = z.object({
  params: z.object({
    id: z.string().trim().min(1).max(100),
  }),
  body: z.object({
    fullName: z.string().trim().max(150).optional(),
    whatsApp: z.string().trim().max(40).optional(),
    categories: z.array(z.string().trim().max(80)).max(20).optional(),
    marketingConsent: z.enum(CONSENT_STATUSES).optional(),
    notes: z.string().max(1000).optional(),
  }),
});

export const saveEmailCampaignSchema = z.object({
  body: z.object({
    id: z.string().trim().max(120).optional(),
    name: z.string().trim().min(1, 'Campaign name is required').max(200),
    subject: z.string().trim().min(1, 'Email subject is required').max(300),
    preheader: z.string().max(300).optional(),
    htmlBody: z.string().min(1, 'Email body is required').max(200_000),
    bannerImageUrl: z.string().max(2000).optional(),
    ctaLabel: z.string().max(120).optional(),
    ctaUrl: z.string().max(1000).optional(),
    targetType: z.enum(TARGET_TYPES),
    targetCategories: z.array(z.string().max(80)).max(30).optional(),
    targetProductIds: z.array(z.string().max(100)).max(100).optional(),
    inactiveDays: z.number().int().min(1).max(3650).optional(),
    neverPurchasedOnly: z.boolean().optional(),
    targetEmails: z.array(z.string().trim().email()).max(2000).optional(),
    scheduledFor: z.string().max(60).optional(),
    action: z.enum(['save_draft', 'schedule', 'send_now']).optional(),
  }),
});

export const campaignActionSchema = z.object({
  params: z.object({
    id: z.string().trim().min(1).max(120),
  }),
  body: z.object({
    action: z.enum(['pause', 'resume', 'cancel', 'send_now', 'delete']),
  }),
});

export const previewBrandedEmailSchema = z.object({
  body: z.object({
    subject: z.string().max(300).optional().default('Preview'),
    greeting: z.string().max(300).optional(),
    bodyHtml: z.string().max(200_000).optional().default(''),
    imageUrl: z.string().max(2000).optional(),
    ctaLabel: z.string().max(120).optional(),
    ctaUrl: z.string().max(1000).optional(),
    preheader: z.string().max(300).optional(),
    sampleName: z.string().max(150).optional(),
  }),
});

export const sendTestBrandedEmailSchema = z.object({
  body: z.object({
    to: z.string().trim().email('Valid test recipient email is required'),
    subject: z.string().trim().min(1).max(300),
    greeting: z.string().max(300).optional(),
    bodyHtml: z.string().max(200_000),
    imageUrl: z.string().max(2000).optional(),
    ctaLabel: z.string().max(120).optional(),
    ctaUrl: z.string().max(1000).optional(),
    preheader: z.string().max(300).optional(),
    sampleName: z.string().max(150).optional(),
  }),
});
