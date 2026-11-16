import { z } from 'zod';

const productDeliveryConfigSchema = z
  .object({
    destinationType: z.enum(['default', 'whatsapp', 'custom_url', 'digital_download']).default('default'),
    whatsappNumber: z.string().trim().optional(),
    whatsappMessageTemplate: z.string().trim().optional(),
    customRedirectUrl: z.string().trim().optional(),
    digitalAssetId: z.string().trim().optional(),
    digitalFileName: z.string().trim().optional(),
    digitalFileSize: z.number().optional(),
    digitalMimeType: z.string().trim().optional(),
  })
  .optional();

export const createProductSchema = z.object({
  body: z
    .object({
      name: z.string().trim().min(2, 'Product name is required'),
      category: z.string().trim().min(2, 'Category is required'),
      image: z.string().trim().optional(),
      imageBase64: z.string().trim().optional(),
      shortDescription: z.string().trim().min(5, 'Short description is required'),
      detailedDescription: z.string().trim().optional().default(''),
      price: z.number().min(0, 'Price must be 0 or greater'),
      priceSourceCurrency: z.enum(['NGN', 'USD']).optional().default('NGN'),
      usdPrice: z.number().min(0).nullable().optional(),
      duration: z.string().trim().min(1, 'Duration is required'),
      isAvailable: z.boolean().optional().default(true),
      isFeatured: z.boolean().optional().default(false),
      seoTitle: z.string().optional(),
      seoDescription: z.string().optional(),
      fulfillmentInstructions: z.string().optional(),
      displayOrder: z.number().optional(),
      commissionRateOverride: z.number().min(0).max(100).nullable().optional(),
      deliveryConfig: productDeliveryConfigSchema,
    })
    .refine((data) => Boolean(data.image?.trim() || data.imageBase64?.trim()), {
      message: 'Product image URL or imageBase64 upload is required',
      path: ['image'],
    }),
});

export const updateProductSchema = z.object({
  params: z.object({
    id: z.string().trim().min(1, 'Product ID is required'),
  }),
  body: z
    .object({
      name: z.string().trim().min(2).optional(),
      category: z.string().trim().min(2).optional(),
      image: z.string().trim().min(1).optional(),
      imageBase64: z.string().trim().min(10).optional(),
      shortDescription: z.string().trim().min(1).optional(),
      detailedDescription: z.string().trim().min(1).optional(),
      price: z.number().min(0).optional(),
      priceSourceCurrency: z.enum(['NGN', 'USD']).optional(),
      usdPrice: z.number().min(0).nullable().optional(),
      duration: z.string().trim().min(1).optional(),
      isAvailable: z.boolean().optional(),
      isFeatured: z.boolean().optional(),
      seoTitle: z.string().optional(),
      seoDescription: z.string().optional(),
      fulfillmentInstructions: z.string().optional(),
      displayOrder: z.number().optional(),
      commissionRateOverride: z.number().min(0).max(100).nullable().optional(),
      deliveryConfig: productDeliveryConfigSchema,
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: 'At least one field must be provided for update',
    }),
});

export const uploadProductImageSchema = z.object({
  params: z.object({
    id: z.string().trim().min(1, 'Product ID is required'),
  }),
  body: z.object({
    imageBase64: z.string().min(10, 'imageBase64 content is required'),
    fileName: z.string().optional(),
  }),
});

export const productIdParamSchema = z.object({
  params: z.object({
    id: z.string().trim().min(1, 'Product ID is required'),
  }),
});
