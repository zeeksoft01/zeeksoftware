import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/ApiError';
import {
  AuthenticatedRequest,
  isAdminAuthConfigured,
  signAuthToken,
  verifyAdminPassword,
} from '../middlewares/auth.middleware';
import { affiliateService, uploadService, userService } from '../services';
import { sanitizeUser } from '../services/user.service';

export const authController = {
  register: asyncHandler(async (req: Request, res: Response) => {
    const body = req.body as {
      fullName: string;
      email: string;
      phone?: string;
      password: string;
      role?: 'affiliate' | 'user';
      bankName?: string;
      accountNumber?: string;
      accountName?: string;
      profilePicture?: string;
    };

    const resolvedProfilePicture = body.profilePicture
      ? await uploadService.resolveCloudinaryImageUrl(body.profilePicture, {
          fileName: body.fullName,
          folder: 'users',
        })
      : undefined;

    const result = await userService.registerUnifiedUser({
      ...body,
      profilePicture: resolvedProfilePicture,
    });

    res.status(201).json({
      success: true,
      message: 'Affiliate partner account registered successfully.',
      token: result.token,
      user: result.user,
      affiliate: result.affiliate,
    });
  }),

  login: asyncHandler(async (req: Request, res: Response) => {
    const { email, password } = req.body as { email?: string; password: string };
    const cleanEmail = (email || '').trim().toLowerCase();

    if (cleanEmail) {
      const result = await userService.authenticateUnifiedUser(cleanEmail, password);
      res.json({
        success: true,
        token: result.token,
        user: result.user,
        affiliate: result.affiliate,
      });
      return;
    }

    if (!isAdminAuthConfigured()) {
      throw new ApiError(400, 'Please enter your email and password to sign in.');
    }
    if (!verifyAdminPassword(password)) {
      throw new ApiError(401, 'Invalid credentials.');
    }

    const token = signAuthToken({
      _id: 'master-admin',
      email: 'master@env',
      name: 'Master Administrator',
      role: 'admin',
      authType: 'env_master',
    });

    res.json({
      success: true,
      token,
      user: {
        _id: 'master-admin',
        fullName: 'Master Administrator',
        name: 'Master Administrator',
        email: 'master@env',
        role: 'admin',
        status: 'active',
        isVerified: true,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      affiliate: null,
    });
  }),

  me: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.authUser) {
      throw new ApiError(401, 'Unauthorized');
    }

    if (req.authUser.authType === 'env_master') {
      res.json({
        success: true,
        user: {
          _id: 'master-admin',
          fullName: 'Master Administrator',
          name: 'Master Administrator',
          email: 'master@env',
          role: 'admin',
          status: 'active',
          isVerified: true,
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        affiliate: null,
      });
      return;
    }

    const user = await userService.getUserById(req.authUser._id);
    if (!user) {
      throw new ApiError(404, 'User account not found');
    }

    const affiliate =
      user.role === 'affiliate' ? await affiliateService.getAffiliateByUserId(user._id) : null;

    res.json({
      success: true,
      user: sanitizeUser(user),
      affiliate,
    });
  }),

  becomeAffiliate: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.authUser || req.authUser.authType === 'env_master') {
      throw new ApiError(401, 'Please sign in with a registered user account.');
    }

    const result = await affiliateService.becomeAffiliate(req.authUser._id, req.body);
    res.json({
      success: true,
      message: 'Affiliate partner profile activated!',
      token: result.token,
      user: result.user,
      affiliate: result.affiliate,
    });
  }),
};
