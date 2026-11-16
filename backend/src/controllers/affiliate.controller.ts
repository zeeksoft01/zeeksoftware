import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { AuthenticatedAffiliateRequest } from '../middlewares/auth.middleware';
import { affiliateService } from '../services';
import { ApiError } from '../utils/ApiError';

export const affiliateController = {
  register: asyncHandler(async (req: Request, res: Response) => {
    const result = await affiliateService.registerAffiliate(req.body);
    res.status(201).json({
      success: true,
      message: 'Affiliate account registered successfully.',
      affiliate: result.affiliate,
      token: result.token,
    });
  }),

  login: asyncHandler(async (req: Request, res: Response) => {
    const { email, password } = req.body;
    const result = await affiliateService.loginAffiliate(email, password);
    res.json({
      success: true,
      affiliate: result.affiliate,
      token: result.token,
    });
  }),

  trackClick: asyncHandler(async (req: Request, res: Response) => {
    const { referralCode, targetPath } = req.body;
    const tracked = await affiliateService.trackReferralClick(referralCode, targetPath);
    res.json({
      success: true,
      tracked,
    });
  }),

  getDashboard: asyncHandler(async (req: AuthenticatedAffiliateRequest, res: Response) => {
    if (!req.affiliateAuth) {
      throw new ApiError(401, 'Unauthorized');
    }
    const dashboard = await affiliateService.getAffiliateDashboard(req.affiliateAuth.affiliateId);
    res.json({
      success: true,
      ...dashboard,
    });
  }),

  requestWithdrawal: asyncHandler(async (req: AuthenticatedAffiliateRequest, res: Response) => {
    if (!req.affiliateAuth) {
      throw new ApiError(401, 'Unauthorized');
    }
    const withdrawal = await affiliateService.requestWithdrawal(
      req.affiliateAuth.affiliateId,
      req.body.amount
    );
    res.status(201).json({
      success: true,
      withdrawal,
      message: 'Withdrawal request submitted and pending admin review.',
    });
  }),
};
