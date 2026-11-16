import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/ApiError';
import { AuthenticatedAdminRequest } from '../middlewares/auth.middleware';
import {
  affiliateService,
  auditService,
  cmsService,
  orderService,
  productService,
  uploadService,
  userService,
} from '../services';

export const adminController = {
  getDashboard: asyncHandler(async (_req: Request, res: Response) => {
    const [products, orders, reviews, inquiries, auditLogs] = await Promise.all([
      productService.getProducts({ onlyAvailable: false }),
      orderService.getOrders(),
      cmsService.getReviews(false),
      cmsService.getInquiries(),
      auditService.getLogs(15),
    ]);

    let verifiedRevenue = 0;
    let unverifiedClaimsAmount = 0;
    let awaitingVerificationCount = 0;
    let requiringFulfillmentCount = 0;

    for (const ord of orders) {
      if (ord.paymentStatus === 'paid') {
        verifiedRevenue += ord.totalAmount;
        if (ord.fulfillmentStatus !== 'Delivered' && ord.fulfillmentStatus !== 'Activation Completed') {
          requiringFulfillmentCount++;
        }
      } else if (ord.paymentStatus === 'awaiting_verification') {
        unverifiedClaimsAmount += ord.totalAmount;
        awaitingVerificationCount++;
      }
    }

    res.json({
      success: true,
      stats: {
        totalProducts: products.length,
        activeProducts: products.filter((p) => p.isAvailable).length,
        totalOrders: orders.length,
        verifiedPaidOrders: orders.filter((o) => o.paymentStatus === 'paid').length,
        ordersAwaitingVerification: awaitingVerificationCount,
        ordersRequiringFulfillment: requiringFulfillmentCount,
        verifiedRevenue,
        unverifiedClaimsAmount,
        totalReviews: reviews.length,
        pendingReviews: reviews.filter((r) => !r.isApproved).length,
        unreadInquiries: inquiries.filter((i) => !i.isRead).length,
      },
      recentOrders: orders.slice(0, 10),
      recentInquiries: inquiries.slice(0, 6),
      auditLogs,
    });
  }),

  getOrders: asyncHandler(async (req: Request, res: Response) => {
    const status = req.query.status as string | undefined;
    const orders = await orderService.getOrders(status);
    res.json({ success: true, orders });
  }),

  updateOrder: asyncHandler(async (req: Request, res: Response) => {
    const { orderId } = req.params;
    const adminName = (req.body.adminUser as string) || 'Admin Ezekiel';
    const updated = await orderService.updateOrder(orderId, req.body, adminName);
    if (!updated) {
      throw new ApiError(404, 'Order not found');
    }
    res.json({ success: true, order: updated });
  }),

  createProduct: asyncHandler(async (req: Request, res: Response) => {
    const product = await productService.createProduct(req.body);
    res.status(201).json({ success: true, product });
  }),

  updateProduct: asyncHandler(async (req: Request, res: Response) => {
    const updated = await productService.updateProduct(req.params.id, req.body);
    if (!updated) {
      throw new ApiError(404, 'Product not found');
    }
    res.json({ success: true, product: updated });
  }),

  uploadProductImage: asyncHandler(async (req: Request, res: Response) => {
    const { imageBase64, fileName } = req.body;
    const result = await productService.uploadProductImage(req.params.id, imageBase64, fileName);
    if (!result) {
      throw new ApiError(404, 'Product not found');
    }
    res.json({
      success: true,
      product: result.product,
      ...result.upload,
    });
  }),

  deleteProduct: asyncHandler(async (req: Request, res: Response) => {
    const deleted = await productService.deleteProduct(req.params.id);
    if (!deleted) {
      throw new ApiError(404, 'Product not found');
    }
    res.json({ success: true, message: 'Product deleted' });
  }),

  updateSettings: asyncHandler(async (req: AuthenticatedAdminRequest, res: Response) => {
    const adminLabel = req.adminAuth?.email || req.adminAuth?.name || 'Admin';
    const settings = await cmsService.updateSettings(req.body, adminLabel);
    res.json({ success: true, settings });
  }),

  updateExchangeRate: asyncHandler(async (req: AuthenticatedAdminRequest, res: Response) => {
    const adminLabel = req.adminAuth?.email || req.adminAuth?.name || 'Admin';
    const { usdNgnRate, syncUsdtRate } = req.body;
    const result = await cmsService.updateExchangeRate(Number(usdNgnRate), {
      syncUsdtRate: Boolean(syncUsdtRate),
      adminUser: adminLabel,
    });
    res.json({
      success: true,
      settings: result.settings,
      updatedProductsCount: result.updatedProductsCount,
    });
  }),

  updateCmsSection: asyncHandler(async (req: Request, res: Response) => {
    const { section } = req.params;
    const body = req.body;

    if (section === 'slides') {
      const slides = await cmsService.updateHeroSlides(body.slides || []);
      res.json({ success: true, slides });
    } else if (section === 'benefits') {
      const benefits = await cmsService.updateBenefitCards(body.benefits || []);
      res.json({ success: true, benefits });
    } else if (section === 'faqs') {
      const faqs = await cmsService.updateFaqs(body.faqs || []);
      res.json({ success: true, faqs });
    } else if (section === 'policies') {
      const policies = await cmsService.updatePolicies(body.policies || {});
      res.json({ success: true, policies });
    } else {
      throw new ApiError(400, 'Invalid CMS section');
    }
  }),

  resetHeroSlides: asyncHandler(async (_req: Request, res: Response) => {
    const slides = await cmsService.resetDefaultSlides();
    res.json({ success: true, slides });
  }),

  getReviews: asyncHandler(async (_req: Request, res: Response) => {
    const reviews = await cmsService.getReviews(false);
    res.json({ success: true, reviews });
  }),

  updateReview: asyncHandler(async (req: Request, res: Response) => {
    const review = await cmsService.updateReview(req.params.id, req.body);
    if (!review) {
      throw new ApiError(404, 'Review not found');
    }
    res.json({ success: true, review });
  }),

  deleteReview: asyncHandler(async (req: Request, res: Response) => {
    const deleted = await cmsService.deleteReview(req.params.id);
    if (!deleted) {
      throw new ApiError(404, 'Review not found');
    }
    res.json({ success: true });
  }),

  getInquiries: asyncHandler(async (_req: Request, res: Response) => {
    const inquiries = await cmsService.getInquiries();
    res.json({ success: true, inquiries });
  }),

  markInquiryRead: asyncHandler(async (req: Request, res: Response) => {
    const found = await cmsService.markInquiryRead(req.params.id);
    if (!found) {
      throw new ApiError(404, 'Inquiry not found');
    }
    res.json({ success: true });
  }),

  replyToInquiry: asyncHandler(async (req: AuthenticatedAdminRequest, res: Response) => {
    const adminName = req.adminAuth?.name || req.adminAuth?.email || 'Admin';
    const { subject, message, status } = req.body;
    const result = await cmsService.replyToInquiry(req.params.id, {
      subject,
      message,
      status,
      adminUser: adminName,
    });
    res.json({
      success: true,
      inquiry: result.inquiry,
      sendResult: result.sendResult,
    });
  }),

  updateInquiryStatus: asyncHandler(async (req: Request, res: Response) => {
    const inquiry = await cmsService.updateInquiryStatus(req.params.id, req.body.status);
    res.json({ success: true, inquiry });
  }),

  getAuditLogs: asyncHandler(async (_req: Request, res: Response) => {
    const auditLogs = await auditService.getLogs(100);
    res.json({ success: true, auditLogs });
  }),

  uploadImage: asyncHandler(async (req: Request, res: Response) => {
    const { imageBase64, fileName } = req.body;
    const uploaded = await uploadService.uploadToCloudinary(imageBase64, fileName);
    res.json({
      success: true,
      ...uploaded,
    });
  }),

  getAffiliates: asyncHandler(async (_req: Request, res: Response) => {
    const affiliates = await affiliateService.getAllAffiliates();
    res.json({ success: true, affiliates });
  }),

  getReferredCustomers: asyncHandler(async (_req: Request, res: Response) => {
    const referredCustomers = await affiliateService.getReferredCustomers();
    res.json({ success: true, referredCustomers });
  }),

  getWithdrawals: asyncHandler(async (_req: Request, res: Response) => {
    const withdrawals = await affiliateService.getWithdrawals();
    res.json({ success: true, withdrawals });
  }),

  updateWithdrawalStatus: asyncHandler(async (req: Request, res: Response) => {
    const { withdrawalId } = req.params;
    const { status, transferReference, rejectionReason, adminNotes, adminUser } = req.body;
    const withdrawal = await affiliateService.updateWithdrawalStatus(withdrawalId, status, {
      transferReference,
      rejectionReason,
      adminNotes,
      adminUser,
    });
    res.json({ success: true, withdrawal });
  }),

  adjustAffiliateBalance: asyncHandler(async (req: Request, res: Response) => {
    const { affiliateId } = req.params;
    const { type, amount, reason, adminUser } = req.body;
    const affiliate = await affiliateService.adjustBalance(
      affiliateId,
      type,
      amount,
      reason,
      adminUser
    );
    res.json({ success: true, affiliate });
  }),

  getAdminUsers: asyncHandler(async (req: Request, res: Response) => {
    const role = typeof req.query.role === 'string' ? req.query.role : undefined;
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    const users = await userService.getAllUsers({ role, status });
    res.json({ success: true, users, admins: users });
  }),

  registerAdminUser: asyncHandler(async (req: AuthenticatedAdminRequest, res: Response) => {
    const actingLabel = req.adminAuth?.email || req.adminAuth?.name || 'Admin';
    const user = await userService.createUser(req.body, actingLabel);
    res.status(201).json({ success: true, user, admin: user });
  }),

  updateAdminUser: asyncHandler(async (req: AuthenticatedAdminRequest, res: Response) => {
    const actingAdmin = {
      _id: req.adminAuth?._id || '',
      label: req.adminAuth?.email || req.adminAuth?.name || 'Admin',
    };
    const user = await userService.updateUser(req.params.id, req.body, actingAdmin);
    res.json({ success: true, user, admin: user });
  }),

  deleteAdminUser: asyncHandler(async (req: AuthenticatedAdminRequest, res: Response) => {
    const actingAdmin = {
      _id: req.adminAuth?._id || '',
      label: req.adminAuth?.email || req.adminAuth?.name || 'Admin',
    };
    const deleted = await userService.deleteUser(req.params.id, actingAdmin);
    if (!deleted) {
      throw new ApiError(404, 'User account not found');
    }
    res.json({ success: true, message: 'User account deleted' });
  }),
};
