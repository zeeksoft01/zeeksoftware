import crypto from 'crypto';
import mongoose from 'mongoose';
import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env';
import { ApiError } from '../utils/ApiError';
import { safeTimingEqual } from '../utils/security';
import { AffiliateModel, UserModel } from '../models';
import { UserRole, UserStatus } from '../types';

const AUTH_TOKEN_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours
const RUNTIME_FALLBACK_SIGNING_KEY = crypto.randomBytes(32).toString('hex');

if (env.isProduction && !env.authJwtSecret && !env.adminSecretKey) {
  console.warn(
    '[Security Warning] Neither AUTH_JWT_SECRET nor ADMIN_SECRET_KEY is configured in production. Ephemeral runtime key is active; configure AUTH_JWT_SECRET for persistent sessions.'
  );
}

const getSigningKey = (): string =>
  env.authJwtSecret || env.adminSecretKey || RUNTIME_FALLBACK_SIGNING_KEY;

export interface AuthTokenPayload {
  sub: string; // User._id (or 'master-admin')
  email: string;
  name: string;
  role: UserRole;
  authType: 'db_user' | 'env_master';
  iat: number;
  exp: number;
}

export type AdminTokenPayload = AuthTokenPayload;

export interface AuthenticatedRequest extends Request {
  authUser?: {
    _id: string;
    email: string;
    name: string;
    role: UserRole;
    status: UserStatus;
    isVerified: boolean;
    authType: 'db_user' | 'env_master';
  };
}

export interface AuthenticatedAdminRequest extends AuthenticatedRequest {
  adminAuth?: {
    _id: string;
    email: string;
    name: string;
    role: UserRole;
    authType: 'db_user' | 'env_master';
  };
}

export interface AuthenticatedAffiliateRequest extends AuthenticatedRequest {
  affiliateAuth?: {
    affiliateId: string;
    userId: string;
    email: string;
  };
}

export const isAdminAuthConfigured = (): boolean =>
  Boolean(env.adminSecretKey && env.adminSecretKey.length >= 6);

export const verifyAdminPassword = (password: string): boolean => {
  if (!isAdminAuthConfigured() || !password) return false;
  return safeTimingEqual(password, env.adminSecretKey);
};

export const signAuthToken = (meta: {
  _id: string;
  email: string;
  name: string;
  role: UserRole;
  authType?: 'db_user' | 'env_master';
}): string => {
  const now = Date.now();
  const payloadData: AuthTokenPayload = {
    sub: meta._id,
    email: meta.email,
    name: meta.name,
    role: meta.role,
    authType: meta.authType || 'db_user',
    iat: now,
    exp: now + AUTH_TOKEN_TTL_MS,
  };
  const payload = Buffer.from(JSON.stringify(payloadData)).toString('base64url');
  const sig = crypto.createHmac('sha256', getSigningKey()).update(payload).digest('base64url');
  return `${payload}.${sig}`;
};

export const signAdminToken = (meta?: {
  _id?: string;
  id?: string;
  email: string;
  name: string;
  role: UserRole;
  authType: 'db_user' | 'env_master' | 'db_admin';
}): string =>
  signAuthToken({
    _id: meta?._id || meta?.id || 'master-admin',
    email: meta?.email || 'master@env',
    name: meta?.name || 'Master Administrator',
    role: meta?.role || 'admin',
    authType: meta?.authType === 'env_master' ? 'env_master' : 'db_user',
  });

export const signAffiliateToken = (userId: string, email: string, name = 'Affiliate Partner'): string =>
  signAuthToken({
    _id: userId,
    email,
    name,
    role: 'affiliate',
    authType: 'db_user',
  });

export const verifyAuthToken = (token: string): AuthTokenPayload | null => {
  if (!token || token.length > 2048) return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [payload, sig] = parts;
  if (!payload || !sig) return null;
  const expectedSig = crypto
    .createHmac('sha256', getSigningKey())
    .update(payload)
    .digest('base64url');
  if (!safeTimingEqual(sig, expectedSig)) {
    return null;
  }
  try {
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf-8')) as AuthTokenPayload;
    if (!decoded?.sub || typeof decoded.exp !== 'number') {
      return null;
    }
    if (decoded.exp <= Date.now()) return null;
    if (decoded.authType === 'env_master' && !isAdminAuthConfigured()) return null;
    return decoded;
  } catch {
    return null;
  }
};

export const verifyAdminToken = verifyAuthToken;

const extractBearerToken = (req: Request): string | null => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  return authHeader.replace('Bearer ', '').trim() || null;
};

export const requireAuth = async (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  const token = extractBearerToken(req);
  if (!token) {
    next(new ApiError(401, 'Unauthorized: Authentication token required'));
    return;
  }

  const decoded = verifyAuthToken(token);
  if (!decoded) {
    next(new ApiError(403, 'Forbidden: Invalid or expired session token'));
    return;
  }

  if (decoded.authType === 'env_master') {
    req.authUser = {
      _id: decoded.sub,
      email: decoded.email,
      name: decoded.name,
      role: 'admin',
      status: 'active',
      isVerified: true,
      authType: 'env_master',
    };
    next();
    return;
  }

  if (!mongoose.Types.ObjectId.isValid(decoded.sub)) {
    next(new ApiError(403, 'Forbidden: Invalid session token'));
    return;
  }

  try {
    const userDoc = await UserModel.findById(decoded.sub).lean();
    if (!userDoc || userDoc.status !== 'active' || userDoc.isActive === false) {
      next(new ApiError(403, 'Forbidden: Account is disabled, suspended, or no longer active'));
      return;
    }
    req.authUser = {
      _id: String(userDoc._id),
      email: userDoc.email,
      name: userDoc.fullName || userDoc.name || userDoc.email,
      role: userDoc.role,
      status: userDoc.status,
      isVerified: Boolean(userDoc.isVerified),
      authType: 'db_user',
    };
    next();
  } catch (err) {
    next(err);
  }
};

export const requireAdmin = async (
  req: AuthenticatedAdminRequest,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  const token = extractBearerToken(req);
  if (!token) {
    next(new ApiError(401, 'Unauthorized: Admin authentication token required'));
    return;
  }

  const decoded = verifyAuthToken(token);
  if (!decoded) {
    next(new ApiError(403, 'Forbidden: Invalid or expired admin session'));
    return;
  }

  if (decoded.authType === 'env_master') {
    req.adminAuth = {
      _id: decoded.sub,
      email: decoded.email,
      name: decoded.name,
      role: 'admin',
      authType: 'env_master',
    };
    next();
    return;
  }

  if (!mongoose.Types.ObjectId.isValid(decoded.sub)) {
    next(new ApiError(403, 'Forbidden: Invalid admin session'));
    return;
  }

  try {
    const adminDoc = await UserModel.findById(decoded.sub).lean();
    if (
      !adminDoc ||
      adminDoc.role !== 'admin' ||
      adminDoc.status !== 'active' ||
      adminDoc.isActive === false ||
      adminDoc.isVerified !== true
    ) {
      next(new ApiError(403, 'Forbidden: Admin account is unverified, disabled, or no longer an admin'));
      return;
    }
    const displayName = adminDoc.fullName || adminDoc.name || adminDoc.email;
    const adminId = String(adminDoc._id);
    req.adminAuth = {
      _id: adminId,
      email: adminDoc.email,
      name: displayName,
      role: 'admin',
      authType: 'db_user',
    };
    req.authUser = {
      _id: adminId,
      email: adminDoc.email,
      name: displayName,
      role: adminDoc.role,
      status: adminDoc.status,
      isVerified: true,
      authType: 'db_user',
    };
    next();
  } catch (err) {
    next(err);
  }
};

export const requireAffiliate = async (
  req: AuthenticatedAffiliateRequest,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  const token = extractBearerToken(req);
  if (!token) {
    next(new ApiError(401, 'Unauthorized: Affiliate authentication token required'));
    return;
  }

  const decoded = verifyAuthToken(token);
  if (!decoded || !mongoose.Types.ObjectId.isValid(decoded.sub)) {
    next(new ApiError(403, 'Forbidden: Invalid or expired affiliate token'));
    return;
  }

  try {
    let userDoc = await UserModel.findById(decoded.sub).lean();
    let affDoc = userDoc ? await AffiliateModel.findOne({ userId: userDoc._id }).lean() : null;

    if (!userDoc && !affDoc) {
      affDoc = await AffiliateModel.findById(decoded.sub).lean();
      if (affDoc) {
        userDoc = await UserModel.findById(affDoc.userId).lean();
      }
    }

    if (
      !userDoc ||
      userDoc.role !== 'affiliate' ||
      userDoc.status !== 'active' ||
      userDoc.isActive === false ||
      !affDoc
    ) {
      next(new ApiError(403, 'Forbidden: Affiliate account is suspended, disabled, or not an active affiliate'));
      return;
    }

    const userIdStr = String(userDoc._id);
    req.affiliateAuth = {
      affiliateId: String(affDoc._id),
      userId: userIdStr,
      email: userDoc.email,
    };
    req.authUser = {
      _id: userIdStr,
      email: userDoc.email,
      name: userDoc.fullName || userDoc.name || userDoc.email,
      role: userDoc.role,
      status: userDoc.status,
      isVerified: Boolean(userDoc.isVerified),
      authType: 'db_user',
    };
    next();
  } catch (err) {
    next(err);
  }
};
