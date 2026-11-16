import crypto from 'crypto';
import mongoose from 'mongoose';
import { Affiliate, SystemUser, UserRole, UserStatus } from '../types';
import {
  AffiliateCommissionModel,
  AffiliateLedgerModel,
  AffiliateModel,
  AffiliateWithdrawalModel,
  OrderModel,
  ReferralClickModel,
  UserModel,
} from '../models';
import { AffiliateRecord } from '../models/Affiliate.model';
import { requireDatabaseConnection } from '../config/database';
import { ApiError } from '../utils/ApiError';
import { auditService } from './audit.service';
import { signAuthToken } from '../middlewares/auth.middleware';
import { emailContactService } from './emailContact.service';
import { safeTimingEqual } from '../utils/security';

export const hashUserPassword = (password: string): string => {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
};

export const verifyUserPassword = (password: string, storedHash?: string): boolean => {
  if (!password || !storedHash || !storedHash.includes(':')) {
    return false;
  }
  const [salt, key] = storedHash.split(':');
  if (!salt || !key) return false;
  try {
    const derived = crypto.scryptSync(password, salt, 64).toString('hex');
    return safeTimingEqual(key, derived);
  } catch {
    return false;
  }
};

export const sanitizeUser = (
  doc: Omit<SystemUser, '_id'> & { _id: unknown }
): Omit<SystemUser, 'passwordHash'> => {
  const { passwordHash: _ignored, _id, ...safe } = doc;
  return {
    _id: String(_id),
    fullName: safe.fullName || safe.name || '',
    name: safe.name || safe.fullName || '',
    email: safe.email,
    phone: safe.phone || '',
    profilePicture: safe.profilePicture,
    role: safe.role,
    status: safe.status,
    isVerified: Boolean(safe.isVerified),
    isActive: safe.isActive !== false && safe.status === 'active',
    createdBy: safe.createdBy || '',
    verifiedBy: safe.verifiedBy || '',
    verifiedAt: safe.verifiedAt || '',
    lastLoginAt: safe.lastLoginAt || '',
    createdAt: safe.createdAt,
    updatedAt: safe.updatedAt,
  };
};

export const isAdminRole = (role: string): boolean => role === 'admin';

export const composeAffiliateDto = (
  aff: AffiliateRecord,
  user: (Omit<SystemUser, '_id'> & { _id: unknown }) | Omit<SystemUser, 'passwordHash'>
): Affiliate => ({
  _id: String(aff._id),
  userId: String(aff.userId),
  fullName: user.fullName || user.name || '',
  email: user.email,
  phone: user.phone || '',
  profilePicture: user.profilePicture,
  referralCode: aff.referralCode,
  status: user.status,
  bankName: aff.bankName || '',
  accountNumber: aff.accountNumber || '',
  accountName: aff.accountName || '',
  availableBalance: aff.availableBalance || 0,
  pendingBalance: aff.pendingBalance || 0,
  totalEarned: aff.totalEarned || 0,
  totalWithdrawn: aff.totalWithdrawn || 0,
  reservedWithdrawalBalance: aff.reservedWithdrawalBalance || 0,
  totalReferredSalesCount: aff.totalReferredSalesCount || 0,
  totalClicks: aff.totalClicks || 0,
  createdAt: aff.createdAt,
  updatedAt: aff.updatedAt,
});

export const userService = {
  async generateUniqueReferralCode(): Promise<string> {
    let refCode = `ZEEK${Math.floor(10000 + Math.random() * 90000)}`;
    while (await AffiliateModel.exists({ referralCode: refCode })) {
      refCode = `ZEEK${Math.floor(10000 + Math.random() * 90000)}`;
    }
    return refCode;
  },

  async ensureAffiliateProfile(
    userId: string,
    bankDetails?: { bankName?: string; accountNumber?: string; accountName?: string }
  ): Promise<AffiliateRecord> {
    requireDatabaseConnection();
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new ApiError(400, 'Invalid user ObjectId for affiliate profile.');
    }
    const userObjectId = new mongoose.Types.ObjectId(userId);
    const existing = await AffiliateModel.findOne({ userId: userObjectId }).lean();
    if (existing) {
      if (
        bankDetails &&
        (bankDetails.bankName || bankDetails.accountNumber || bankDetails.accountName)
      ) {
        const updated = await AffiliateModel.findByIdAndUpdate(
          existing._id,
          {
            $set: {
              ...(bankDetails.bankName ? { bankName: bankDetails.bankName.trim() } : {}),
              ...(bankDetails.accountNumber ? { accountNumber: bankDetails.accountNumber.trim() } : {}),
              ...(bankDetails.accountName ? { accountName: bankDetails.accountName.trim() } : {}),
              updatedAt: new Date().toISOString(),
            },
          },
          { new: true }
        ).lean();
        return updated as AffiliateRecord;
      }
      return existing as AffiliateRecord;
    }

    const now = new Date().toISOString();
    const referralCode = await this.generateUniqueReferralCode();
    const created = await AffiliateModel.create({
      userId: userObjectId,
      referralCode,
      bankName: (bankDetails?.bankName || '').trim(),
      accountNumber: (bankDetails?.accountNumber || '').trim(),
      accountName: (bankDetails?.accountName || '').trim(),
      availableBalance: 0,
      pendingBalance: 0,
      totalEarned: 0,
      totalWithdrawn: 0,
      reservedWithdrawalBalance: 0,
      totalReferredSalesCount: 0,
      totalClicks: 0,
      createdAt: now,
      updatedAt: now,
    });
    return created.toObject() as AffiliateRecord;
  },

  async syncLegacyUsersToUnifiedCollection(): Promise<void> {
    requireDatabaseConnection();

    // Clean obsolete indexes from prior schema versions so unique constraints align
    await UserModel.collection.dropIndex('id_1').catch(() => {});
    await UserModel.collection.dropIndex('referralCode_1').catch(() => {});
    await AffiliateModel.collection.dropIndex('id_1').catch(() => {});
    await AffiliateModel.collection.dropIndex('email_1').catch(() => {});
    await mongoose.connection.db?.dropCollection('adminusers').catch(() => {});

    // 1. Normalize legacy roles on users collection
    await UserModel.updateMany(
      { role: 'super_admin' as unknown as UserRole },
      { $set: { role: 'admin' } }
    ).catch(() => {});
    await UserModel.updateMany(
      { role: { $in: ['moderator', 'support'] as unknown as UserRole[] } },
      { $set: { role: 'user' } }
    ).catch(() => {});

    // Build lookup map of legacy string user.id -> user._id ObjectId
    const oldUserIdMap = new Map<string, mongoose.Types.ObjectId>();
    const rawUsers = await UserModel.collection.find({}).toArray();
    for (const rawUser of rawUsers) {
      if (typeof rawUser.id === 'string' && rawUser.id) {
        oldUserIdMap.set(rawUser.id, rawUser._id as mongoose.Types.ObjectId);
      }
      // Also extract any embedded affiliate fields from prior versions
      if (rawUser.role === 'affiliate' || (typeof rawUser.referralCode === 'string' && rawUser.referralCode)) {
        const existingAff = await AffiliateModel.collection.findOne({
          $or: [
            { userId: rawUser._id },
            ...(typeof rawUser.id === 'string' ? [{ userId: rawUser.id }] : []),
            ...(rawUser.referralCode ? [{ referralCode: rawUser.referralCode }] : []),
          ],
        });
        if (!existingAff) {
          const referralCode =
            typeof rawUser.referralCode === 'string' && rawUser.referralCode.trim()
              ? rawUser.referralCode.trim().toUpperCase()
              : await this.generateUniqueReferralCode();
          await AffiliateModel.create({
            userId: rawUser._id as mongoose.Types.ObjectId,
            referralCode,
            bankName: String(rawUser.bankName || ''),
            accountNumber: String(rawUser.accountNumber || ''),
            accountName: String(rawUser.accountName || ''),
            availableBalance: Number(rawUser.availableBalance || 0),
            pendingBalance: Number(rawUser.pendingBalance || 0),
            totalEarned: Number(rawUser.totalEarned || 0),
            totalWithdrawn: Number(rawUser.totalWithdrawn || 0),
            reservedWithdrawalBalance: Number(rawUser.reservedWithdrawalBalance || 0),
            totalReferredSalesCount: Number(rawUser.totalReferredSalesCount || 0),
            totalClicks: Number(rawUser.totalClicks || 0),
            createdAt: String(rawUser.createdAt || new Date().toISOString()),
            updatedAt: String(rawUser.updatedAt || new Date().toISOString()),
          }).catch(() => {});
        }
      }
    }

    // 2. Migrate affiliates collection: ensure userId is ObjectId referencing users._id, strip legacy id & user fields
    const oldAffIdMap = new Map<string, string>();
    const rawAffiliates = await AffiliateModel.collection.find({}).toArray();
    for (const aff of rawAffiliates) {
      let userObjId: mongoose.Types.ObjectId | null = null;
      if (aff.userId instanceof mongoose.Types.ObjectId) {
        userObjId = aff.userId;
      } else if (typeof aff.userId === 'string') {
        if (oldUserIdMap.has(aff.userId)) {
          userObjId = oldUserIdMap.get(aff.userId)!;
        } else if (mongoose.Types.ObjectId.isValid(aff.userId)) {
          userObjId = new mongoose.Types.ObjectId(aff.userId);
        }
      }

      if (!userObjId) {
        const cleanEmail = typeof aff.email === 'string' ? aff.email.trim().toLowerCase() : '';
        if (cleanEmail) {
          const existingUser = await UserModel.findOne({ email: cleanEmail }).lean();
          if (existingUser) {
            userObjId = existingUser._id as unknown as mongoose.Types.ObjectId;
          } else {
            const now = String(aff.createdAt || new Date().toISOString());
            const createdUser = await UserModel.create({
              fullName: String(aff.fullName || 'Affiliate Partner'),
              name: String(aff.fullName || 'Affiliate Partner'),
              email: cleanEmail,
              phone: String(aff.phone || ''),
              passwordHash:
                typeof aff.passwordHash === 'string' && aff.passwordHash
                  ? aff.passwordHash
                  : hashUserPassword(crypto.randomBytes(12).toString('hex')),
              profilePicture: typeof aff.profilePicture === 'string' ? aff.profilePicture : undefined,
              role: 'affiliate',
              status: aff.status === 'suspended' ? 'suspended' : 'active',
              isVerified: true,
              isActive: aff.status !== 'suspended',
              createdBy: 'Migrated Affiliate',
              verifiedBy: 'System',
              verifiedAt: now,
              lastLoginAt: '',
              createdAt: now,
              updatedAt: String(aff.updatedAt || now),
            }).catch(() => null);
            if (createdUser) {
              userObjId = createdUser._id as unknown as mongoose.Types.ObjectId;
            }
          }
        }
      }

      if (typeof aff.id === 'string' && aff.id) {
        oldAffIdMap.set(aff.id, String(aff._id));
      }

      await AffiliateModel.collection
        .updateOne(
          { _id: aff._id },
          {
            ...(userObjId ? { $set: { userId: userObjId } } : {}),
            $unset: {
              id: '',
              email: '',
              passwordHash: '',
              fullName: '',
              phone: '',
              status: '',
              profilePicture: '',
            },
          }
        )
        .catch(() => {});
    }

    // Remap historical affiliateId references from old string `aff-...` to new String(aff._id)
    for (const [oldAffId, newAffId] of oldAffIdMap.entries()) {
      await Promise.all([
        OrderModel.updateMany({ affiliateId: oldAffId }, { $set: { affiliateId: newAffId } }).catch(() => {}),
        ReferralClickModel.updateMany({ affiliateId: oldAffId }, { $set: { affiliateId: newAffId } }).catch(() => {}),
        AffiliateCommissionModel.updateMany({ affiliateId: oldAffId }, { $set: { affiliateId: newAffId } }).catch(() => {}),
        AffiliateWithdrawalModel.updateMany({ affiliateId: oldAffId }, { $set: { affiliateId: newAffId } }).catch(() => {}),
        AffiliateLedgerModel.updateMany({ affiliateId: oldAffId }, { $set: { affiliateId: newAffId } }).catch(() => {}),
      ]);
    }

    // 4. Strip legacy `id` and any embedded affiliate-only fields from all users documents
    await UserModel.collection
      .updateMany(
        {},
        {
          $unset: {
            id: '',
            referralCode: '',
            bankName: '',
            accountNumber: '',
            accountName: '',
            availableBalance: '',
            pendingBalance: '',
            totalEarned: '',
            totalWithdrawn: '',
            reservedWithdrawalBalance: '',
            totalReferredSalesCount: '',
            totalClicks: '',
          },
        }
      )
      .catch(() => {});
  },

  async getAllUsers(filters?: {
    role?: string;
    status?: string;
  }): Promise<Omit<SystemUser, 'passwordHash'>[]> {
    requireDatabaseConnection();
    const query: Record<string, unknown> = {};
    if (filters?.role && filters.role !== 'all') {
      if (filters.role === 'admins') {
        query.role = 'admin';
      } else {
        query.role = filters.role;
      }
    }
    if (filters?.status && filters.status !== 'all') {
      query.status = filters.status;
    }

    const docs = await UserModel.find(query).sort({ createdAt: -1 }).lean();
    return docs.map((doc) => sanitizeUser(doc));
  },

  async getUserById(id: string): Promise<SystemUser | null> {
    requireDatabaseConnection();
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    const doc = await UserModel.findById(id).lean();
    if (!doc) return null;
    return { ...doc, _id: String(doc._id) } as SystemUser;
  },

  async getUserByEmail(email: string): Promise<SystemUser | null> {
    requireDatabaseConnection();
    const cleanEmail = email.trim().toLowerCase();
    const doc = await UserModel.findOne({ email: cleanEmail }).lean();
    if (!doc) return null;
    return { ...doc, _id: String(doc._id) } as SystemUser;
  },

  async registerUnifiedUser(input: {
    fullName: string;
    email: string;
    phone?: string;
    password: string;
    role?: 'affiliate' | 'user';
    profilePicture?: string;
    bankName?: string;
    accountNumber?: string;
    accountName?: string;
    marketingConsent?: boolean;
  }): Promise<{
    token: string;
    user: Omit<SystemUser, 'passwordHash'>;
    affiliate: Affiliate | null;
  }> {
    requireDatabaseConnection();
    const cleanEmail = input.email.trim().toLowerCase();
    const existing = await UserModel.findOne({ email: cleanEmail }).lean();
    if (existing) {
      throw new ApiError(409, 'A user account with this email address already exists.');
    }

    const cleanName = input.fullName.trim();
    if (!cleanName) {
      throw new ApiError(400, 'Full name is required.');
    }

    if (input.role === 'user') {
      throw new ApiError(
        400,
        'Standard user registration is not active yet. Please register via Become Affiliate.'
      );
    }
    if ((input.role as string) === 'admin') {
      throw new ApiError(400, 'Admin accounts cannot be self-registered.');
    }

    // Default role is 'affiliate'
    const assignedRole: UserRole = 'affiliate';
    const now = new Date().toISOString();

    const createdDoc = await UserModel.create({
      fullName: cleanName,
      name: cleanName,
      email: cleanEmail,
      phone: (input.phone || '').trim(),
      passwordHash: hashUserPassword(input.password),
      profilePicture: input.profilePicture,
      role: assignedRole,
      status: 'active',
      isVerified: true,
      isActive: true,
      createdBy: 'Self Registration',
      verifiedBy: 'Auto-Verified',
      verifiedAt: now,
      lastLoginAt: now,
      createdAt: now,
      updatedAt: now,
    });

    const createdUserObj = createdDoc.toObject();
    const userIdStr = String(createdUserObj._id);

    const affRecord = await this.ensureAffiliateProfile(userIdStr, {
      bankName: input.bankName,
      accountNumber: input.accountNumber,
      accountName: input.accountName,
    });
    const affiliateDto = composeAffiliateDto(affRecord, createdUserObj);

    await emailContactService
      .upsertCollectedEmail({
        email: cleanEmail,
        fullName: cleanName,
        whatsApp: input.phone,
        source: assignedRole === 'affiliate' ? 'affiliate_registration' : 'customer_registration',
        categories:
          assignedRole === 'affiliate' ? ['Affiliates', 'Newly Registered Affiliates'] : undefined,
        userId: userIdStr,
        affiliateId: assignedRole === 'affiliate' ? affiliateDto._id : undefined,
        explicitOptIn: Boolean(input.marketingConsent),
        consentSource: input.marketingConsent ? 'registration_opt_in' : undefined,
      })
      .catch(console.error);

    await auditService.addLog(
      'Affiliate Registered',
      `New ${assignedRole} registered: ${cleanEmail} (User ID: ${userIdStr})`,
      'System'
    );

    const token = signAuthToken({
      _id: userIdStr,
      email: createdUserObj.email,
      name: cleanName,
      role: createdUserObj.role,
      authType: 'db_user',
    });

    return {
      token,
      user: sanitizeUser(createdUserObj),
      affiliate: affiliateDto,
    };
  },

  async authenticateUnifiedUser(
    email: string,
    password: string
  ): Promise<{
    token: string;
    user: Omit<SystemUser, 'passwordHash'>;
    affiliate: Affiliate | null;
  }> {
    requireDatabaseConnection();
    const cleanEmail = email.trim().toLowerCase();
    const doc = await UserModel.findOne({ email: cleanEmail }).lean();

    if (!doc || !verifyUserPassword(password, doc.passwordHash)) {
      throw new ApiError(401, 'Invalid email or password.');
    }

    if (doc.status !== 'active' || doc.isActive === false) {
      throw new ApiError(
        403,
        `Your account status is currently "${doc.status}". Please contact support or an administrator.`
      );
    }

    if (doc.role === 'admin' && doc.isVerified !== true) {
      throw new ApiError(
        403,
        'Your admin account is not verified yet. Ask an existing verified administrator to verify your account.'
      );
    }

    const now = new Date().toISOString();
    await UserModel.updateOne(
      { _id: doc._id },
      { $set: { lastLoginAt: now, updatedAt: now } }
    );

    const updatedUser = sanitizeUser({
      ...doc,
      lastLoginAt: now,
      updatedAt: now,
    });

    let affiliateDto: Affiliate | null = null;
    if (updatedUser.role === 'affiliate') {
      const affRecord = await this.ensureAffiliateProfile(updatedUser._id);
      affiliateDto = composeAffiliateDto(affRecord, updatedUser);
    }

    const token = signAuthToken({
      _id: updatedUser._id,
      email: updatedUser.email,
      name: updatedUser.fullName || updatedUser.email,
      role: updatedUser.role,
      authType: 'db_user',
    });

    return {
      token,
      user: updatedUser,
      affiliate: affiliateDto,
    };
  },

  async createUser(
    input: {
      fullName?: string;
      name?: string;
      email: string;
      phone?: string;
      password: string;
      role?: UserRole;
      status?: UserStatus;
      isVerified?: boolean;
      bankName?: string;
      accountNumber?: string;
      accountName?: string;
      profilePicture?: string;
    },
    createdByLabel: string
  ): Promise<Omit<SystemUser, 'passwordHash'>> {
    requireDatabaseConnection();
    const cleanEmail = input.email.trim().toLowerCase();
    const existing = await UserModel.findOne({ email: cleanEmail }).lean();
    if (existing) {
      throw new ApiError(409, 'A user account with this email address already exists.');
    }

    const displayName = (input.fullName || input.name || '').trim();
    if (!displayName) {
      throw new ApiError(400, 'Full name is required.');
    }

    const now = new Date().toISOString();
    const assignedRole: UserRole = input.role || 'affiliate';
    const assignedStatus: UserStatus = input.status || 'active';
    const verified = Boolean(input.isVerified);

    const createdDoc = await UserModel.create({
      fullName: displayName,
      name: displayName,
      email: cleanEmail,
      phone: (input.phone || '').trim(),
      passwordHash: hashUserPassword(input.password),
      profilePicture: input.profilePicture,
      role: assignedRole,
      status: assignedStatus,
      isVerified: verified,
      isActive: assignedStatus === 'active',
      createdBy: createdByLabel,
      verifiedBy: verified ? createdByLabel : '',
      verifiedAt: verified ? now : '',
      lastLoginAt: '',
      createdAt: now,
      updatedAt: now,
    });

    const createdObj = createdDoc.toObject();
    const createdIdStr = String(createdObj._id);

    let createdAffiliateId: string | undefined;
    if (assignedRole === 'affiliate') {
      const aff = await this.ensureAffiliateProfile(createdIdStr, {
        bankName: input.bankName,
        accountNumber: input.accountNumber,
        accountName: input.accountName,
      });
      createdAffiliateId = String(aff._id);
    }

    if (assignedRole !== 'admin') {
      await emailContactService
        .upsertCollectedEmail({
          email: cleanEmail,
          fullName: displayName,
          whatsApp: input.phone,
          source: assignedRole === 'affiliate' ? 'affiliate_registration' : 'customer_registration',
          categories:
            assignedRole === 'affiliate' ? ['Affiliates', 'Newly Registered Affiliates'] : undefined,
          userId: createdIdStr,
          affiliateId: createdAffiliateId,
        })
        .catch(() => {});
    }

    await auditService.addLog(
      'Create User Account',
      `Registered ${cleanEmail} (role: ${assignedRole}, status: ${assignedStatus}, verified: ${verified})`,
      createdByLabel
    );

    return sanitizeUser(createdObj);
  },

  async updateUser(
    id: string,
    updates: {
      fullName?: string;
      name?: string;
      phone?: string;
      role?: UserRole;
      status?: UserStatus;
      isVerified?: boolean;
      isActive?: boolean;
      password?: string;
      bankName?: string;
      accountNumber?: string;
      accountName?: string;
    },
    actingAdmin: { _id: string; label: string }
  ): Promise<Omit<SystemUser, 'passwordHash'>> {
    requireDatabaseConnection();
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new ApiError(404, 'User account not found.');
    }
    const existing = await UserModel.findById(id).lean();
    if (!existing) {
      throw new ApiError(404, 'User account not found.');
    }

    const existingIdStr = String(existing._id);
    const nextStatus: UserStatus | undefined =
      updates.status !== undefined
        ? updates.status
        : typeof updates.isActive === 'boolean'
        ? updates.isActive
          ? 'active'
          : 'disabled'
        : undefined;

    if (existingIdStr === actingAdmin._id) {
      if (updates.isVerified === false) {
        throw new ApiError(400, 'You cannot unverify your own currently logged-in admin account.');
      }
      if (nextStatus && nextStatus !== 'active') {
        throw new ApiError(400, 'You cannot disable or suspend your own currently logged-in admin account.');
      }
      if (updates.role && !isAdminRole(updates.role)) {
        throw new ApiError(400, 'You cannot remove your own administrator role.');
      }
    }

    const now = new Date().toISOString();
    const setFields: Record<string, unknown> = { updatedAt: now };

    const updatedName = (updates.fullName || updates.name || '').trim();
    if (updatedName) {
      setFields.fullName = updatedName;
      setFields.name = updatedName;
    }
    if (typeof updates.phone === 'string') {
      setFields.phone = updates.phone.trim();
    }
    if (updates.role) {
      setFields.role = updates.role;
    }
    if (nextStatus) {
      setFields.status = nextStatus;
      setFields.isActive = nextStatus === 'active';
    }
    if (typeof updates.isVerified === 'boolean') {
      setFields.isVerified = updates.isVerified;
      setFields.verifiedBy = updates.isVerified ? actingAdmin.label : '';
      setFields.verifiedAt = updates.isVerified ? now : '';
    }
    if (typeof updates.password === 'string' && updates.password.trim().length >= 6) {
      setFields.passwordHash = hashUserPassword(updates.password.trim());
    }

    const updated = await UserModel.findByIdAndUpdate(
      id,
      { $set: setFields },
      { new: true }
    ).lean();

    if (updates.role === 'affiliate') {
      await this.ensureAffiliateProfile(existingIdStr, {
        bankName: updates.bankName,
        accountNumber: updates.accountNumber,
        accountName: updates.accountName,
      });
    } else if (
      typeof updates.bankName === 'string' ||
      typeof updates.accountNumber === 'string' ||
      typeof updates.accountName === 'string'
    ) {
      const hasAff = await AffiliateModel.exists({ userId: new mongoose.Types.ObjectId(existingIdStr) });
      if (hasAff) {
        await this.ensureAffiliateProfile(existingIdStr, {
          bankName: updates.bankName,
          accountNumber: updates.accountNumber,
          accountName: updates.accountName,
        });
      }
    }

    await auditService.addLog(
      'Update User Account',
      `Updated user ${existing.email}: ${Object.keys(setFields)
        .filter((k) => k !== 'passwordHash' && k !== 'updatedAt')
        .join(', ')}`,
      actingAdmin.label
    );

    return sanitizeUser(updated!);
  },

  async deleteUser(id: string, actingAdmin: { _id: string; label: string }): Promise<boolean> {
    requireDatabaseConnection();
    if (!mongoose.Types.ObjectId.isValid(id)) return false;
    if (id === actingAdmin._id) {
      throw new ApiError(400, 'You cannot delete your own currently logged-in admin account.');
    }
    const deleted = await UserModel.findByIdAndDelete(id).lean();
    if (!deleted) return false;
    await AffiliateModel.deleteOne({ userId: deleted._id }).catch(() => {});
    await auditService.addLog(
      'Delete User Account',
      `Deleted user account: ${deleted.email} (${deleted.role})`,
      actingAdmin.label
    );
    return true;
  },
};
