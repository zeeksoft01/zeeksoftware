import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/ApiError';
import { waitForDatabaseReady } from '../config/database';
import { cmsService, emailContactService, emailService, productService } from '../services';

export const storeController = {
  getBootstrap: asyncHandler(async (_req: Request, res: Response) => {
    await waitForDatabaseReady(8000);
    const data = await cmsService.getBootstrapData();
    res.json({
      success: true,
      data,
      serverTime: new Date().toISOString(),
    });
  }),

  getProducts: asyncHandler(async (req: Request, res: Response) => {
    const category = req.query.category as string | undefined;
    const search = req.query.search as string | undefined;
    const products = await productService.getProducts({
      onlyAvailable: true,
      category,
      search,
    });
    res.json({ success: true, products });
  }),

  getProductById: asyncHandler(async (req: Request, res: Response) => {
    const product = await productService.getProductById(req.params.id);
    if (!product) {
      throw new ApiError(404, 'Product not found');
    }
    res.json({ success: true, product });
  }),

  submitContact: asyncHandler(async (req: Request, res: Response) => {
    const { fullName, email, whatsApp, subject, message, marketingConsent } = req.body;
    const [msg, settings] = await Promise.all([
      cmsService.addInquiry({ fullName, email, whatsApp, subject, message }),
      cmsService.getSettings().catch(() => null),
    ]);

    await emailContactService
      .upsertCollectedEmail({
        email,
        fullName,
        whatsApp,
        source: 'contact_form',
        categories: ['New Emails'],
        explicitOptIn: Boolean(marketingConsent),
        consentSource: marketingConsent ? 'contact_form_opt_in' : undefined,
      })
      .catch(console.error);

    const mailResult = await emailService.notifySupportContactInquiry({
      inquiryId: msg.id,
      fullName: msg.fullName,
      email: msg.email,
      whatsApp: msg.whatsApp,
      subject: msg.subject,
      message: msg.message,
      recipientEmail: settings?.supportEmail?.trim() || 'Zeeksoftwares@gmail.com',
    });

    res.json({
      success: true,
      message: 'Your inquiry has been received. Our support team will get back to you shortly.',
      inquiryId: msg.id,
      emailSent: mailResult.sent,
      emailProvider: mailResult.provider,
    });
  }),

  submitReview: asyncHandler(async (req: Request, res: Response) => {
    const { customerName, rating, reviewMessage, productPurchased, orderId } = req.body;
    const review = await cmsService.submitReview({
      customerName,
      rating,
      reviewMessage,
      productPurchased,
      orderId,
    });
    res.json({
      success: true,
      message: 'Thank you! Your review has been submitted for verification.',
      review,
    });
  }),
};
