import crypto from 'crypto';
import mongoose from 'mongoose';
import {
  Affiliate,
  ReferralClick,
  ReferralAttribution,
  AffiliateCommission,
  AffiliateWithdrawal,
  AffiliateLedgerEntry,
  Order,
  SystemUser,
} from '../types';
import {
  AffiliateModel,
  UserModel,
  ReferralClickModel,
  ReferralAttributionModel,
  AffiliateCommissionModel,
  AffiliateWithdrawalModel,
  AffiliateLedgerModel,
  OrderModel,
} from '../models';
import { AffiliateRecord } from '../models/Affiliate.model';
import { requireDatabaseConnection } from '../config/database';
import { ApiError } from '../utils/ApiError';
import { cmsService } from './cms.service';
import { productService } from './product.service';
import { auditService } from './audit.service';
import { emailService } from './email.service';
import { uploadService } from './upload.service';
import { composeAffiliateDto, sanitizeUser, userService } from './user.service';
import { signAuthToken } from '../middlewares/auth.middleware';
import { emailContactService } from './emailContact.service';
import { cryptoRandomHex } from '../utils/security';

export const affiliateService = {
  async hydrateMany(records: AffiliateRecord[]): Promise<Affiliate[]> {
    if (records.length === 0) return [];
    const userIds = Array.from(
      new Set(
        records
          .map((r) => String(r.userId || ''))
          .filter((id) => mongoose.Types.ObjectId.isValid(id))
      )
    );

    const userDocs = await UserModel.find({ _id: { $in: userIds } }).lean<Array<Omit<SystemUser, '_id'> & { _id: unknown }>>();
    const userMap = new Map<string, Omit<SystemUser, '_id'> & { _id: unknown }>();
    for (const u of userDocs) {
      userMap.set(String(u._id), u);
    }
    return records
      .map((rec) => {
        const user = userMap.get(String(rec.userId));
        if (!user) return null;
        return composeAffiliateDto(rec, user);
      })
      .filter((item): item is Affiliate => item !== null);
  },

  async getAllAffiliates(): Promise<Affiliate[]> {
    requireDatabaseConnection();
    const docs = await AffiliateModel.find().sort({ createdAt: -1 }).lean();
    return this.hydrateMany(docs as AffiliateRecord[]);
  },

  async getAffiliateById(idOrUserId: string): Promise<Affiliate | null> {
    requireDatabaseConnection();
    if (!mongoose.Types.ObjectId.isValid(idOrUserId)) return null;
    const objId = new mongoose.Types.ObjectId(idOrUserId);
    const affDoc = await AffiliateModel.findOne({
      $or: [{ _id: objId }, { userId: objId }],
    }).lean();
    if (!affDoc) return null;
    const userDoc = await UserModel.findById(affDoc.userId).lean();
    if (!userDoc) return null;
    return composeAffiliateDto(affDoc as AffiliateRecord, userDoc);
  },

  async getAffiliateByUserId(userId: string): Promise<Affiliate | null> {
    requireDatabaseConnection();
    if (!mongoose.Types.ObjectId.isValid(userId)) return null;
    const userObjId = new mongoose.Types.ObjectId(userId);
    const affDoc = await AffiliateModel.findOne({ userId: userObjId }).lean();
    if (!affDoc) return null;
    const userDoc = await UserModel.findById(userObjId).lean();
    if (!userDoc) return null;
    return composeAffiliateDto(affDoc as AffiliateRecord, userDoc);
  },

  async getAffiliateByReferralCode(code: string): Promise<Affiliate | null> {
    requireDatabaseConnection();
    const cleanCode = code.trim().toUpperCase();
    const affDoc = await AffiliateModel.findOne({ referralCode: cleanCode }).lean();
    if (!affDoc) return null;
    const userDoc = await UserModel.findById(affDoc.userId).lean();
    if (!userDoc) return null;
    return composeAffiliateDto(affDoc as AffiliateRecord, userDoc);
  },

  async registerAffiliate(input: {
    fullName: string;
    email: string;
    phone: string;
    password?: string;
    bankName: string;
    accountNumber: string;
    accountName: string;
    profilePicture?: string;
    marketingConsent?: boolean;
  }) {
    requireDatabaseConnection();
    const resolvedProfilePicture = input.profilePicture
      ? await uploadService.resolveCloudinaryImageUrl(input.profilePicture, {
          fileName: input.fullName,
          folder: 'affiliates',
        })
      : undefined;

    const rawPassword = input.password || crypto.randomBytes(8).toString('hex');
    const result = await userService.registerUnifiedUser({
      fullName: input.fullName,
      email: input.email,
      phone: input.phone,
      password: rawPassword,
      role: 'affiliate',
      profilePicture: resolvedProfilePicture,
      bankName: input.bankName,
      accountNumber: input.accountNumber,
      accountName: input.accountName,
      marketingConsent: input.marketingConsent,
    });

    return {
      affiliate: result.affiliate!,
      user: result.user,
      token: result.token,
    };
  },

  async becomeAffiliate(
    userId: string,
    input: {
      phone?: string;
      bankName: string;
      accountNumber: string;
      accountName: string;
    }
  ) {
    requireDatabaseConnection();
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new ApiError(404, 'User account not found.');
    }
    const userDoc = await UserModel.findById(userId).lean();
    if (!userDoc) {
      throw new ApiError(404, 'User account not found.');
    }
    if (userDoc.status !== 'active' || userDoc.isActive === false) {
      throw new ApiError(403, `Your account status is "${userDoc.status}" and cannot become an affiliate.`);
    }

    const now = new Date().toISOString();
    const updatedUserDoc = await UserModel.findByIdAndUpdate(
      userId,
      {
        $set: {
          role: userDoc.role === 'admin' ? 'admin' : 'affiliate',
          ...(input.phone?.trim() ? { phone: input.phone.trim() } : {}),
          updatedAt: now,
        },
      },
      { new: true }
    ).lean();

    const affRecord = await userService.ensureAffiliateProfile(userId, {
      bankName: input.bankName,
      accountNumber: input.accountNumber,
      accountName: input.accountName,
    });

    const cleanUser = sanitizeUser(updatedUserDoc!);
    const affiliate = composeAffiliateDto(affRecord, cleanUser);

    await emailContactService
      .upsertCollectedEmail({
        email: cleanUser.email,
        fullName: cleanUser.fullName,
        whatsApp: cleanUser.phone,
        source: 'affiliate_registration',
        categories: ['Affiliates', 'Newly Registered Affiliates'],
        userId: cleanUser._id,
        affiliateId: affiliate._id,
      })
      .catch(() => {});

    const token = signAuthToken({
      _id: cleanUser._id,
      email: cleanUser.email,
      name: cleanUser.fullName || cleanUser.email,
      role: cleanUser.role,
      authType: 'db_user',
    });

    await auditService.addLog(
      'Affiliate Activated',
      `User ${cleanUser.email} (${cleanUser._id}) activated affiliate profile ${affRecord.referralCode}`,
      cleanUser.email
    );

    return {
      token,
      user: cleanUser,
      affiliate,
    };
  },

  async loginAffiliate(email: string, password: string) {
    requireDatabaseConnection();
    const result = await userService.authenticateUnifiedUser(email, password);
    if (result.user.role !== 'affiliate' || !result.affiliate) {
      throw new ApiError(403, 'This account does not have affiliate partner privileges');
    }
    return {
      affiliate: result.affiliate,
      user: result.user,
      token: result.token,
    };
  },

  async trackReferralClick(referralCode: string, targetPath?: string): Promise<boolean> {
    requireDatabaseConnection();
    const aff = await this.getAffiliateByReferralCode(referralCode);
    if (!aff || aff.status !== 'active' || !aff.referralCode) return false;

    const clickItem: ReferralClick = {
      id: `clk-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      affiliateId: aff._id,
      referralCode: aff.referralCode,
      targetPath,
      timestamp: new Date().toISOString(),
    };

    await Promise.all([
      ReferralClickModel.create(clickItem),
      AffiliateModel.updateOne(
        { _id: new mongoose.Types.ObjectId(aff._id) },
        { $inc: { totalClicks: 1 }, $set: { updatedAt: new Date().toISOString() } }
      ),
    ]);
    return true;
  },

  async awardAffiliateCommission(order: Order): Promise<void> {
    requireDatabaseConnection();
    if (order.commissionAwarded || !order.affiliateId) return;

    // Duplicate transaction commission guard
    const existingComm = await AffiliateCommissionModel.findOne({ orderId: order.id }).lean();
    if (existingComm) return;

    const affiliate = await this.getAffiliateById(order.affiliateId);
    if (!affiliate || affiliate.status !== 'active') return;

    const normalizedEmail = order.customerEmail.trim().toLowerCase();
    if (normalizedEmail === affiliate.email.trim().toLowerCase()) {
      await OrderModel.updateOne(
        { id: order.id },
        { $set: { commissionSkippedReason: 'Self-referral prevented' } }
      );
      await auditService.addLog(
        'Commission Skipped',
        `Self-referral detected for order ${order.id}. Customer email matches affiliate email.`,
        'Affiliate System'
      );
      return;
    }

    const settings = await cmsService.getSettings();
    const recurringEnabled = settings.recurringCommissionsEnabled !== false;
    const now = new Date().toISOString();

    // Ensure attribution record exists (for orders created directly or before attribution rollout)
    let attr = await ReferralAttributionModel.findOne({ customerEmail: normalizedEmail }).lean();
    if (!attr) {
      const priorOrders = await OrderModel.find({
        customerEmail: normalizedEmail,
        affiliateId: affiliate._id,
        id: { $ne: order.id },
      })
        .sort({ createdAt: 1 })
        .lean();
      const priorComm = priorOrders.length
        ? await AffiliateCommissionModel.findOne({
            orderId: { $in: priorOrders.map((o) => o.id) },
          }).lean()
        : null;

      try {
        attr = await ReferralAttributionModel.create({
          id: `attr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          customerEmail: normalizedEmail,
          customerName: order.customerName,
          customerWhatsApp: order.customerWhatsApp,
          affiliateId: affiliate._id,
          referralCode: order.referralCode || affiliate.referralCode,
          firstOrderId: priorOrders[0]?.id || order.id,
          firstCommissionOrderId: priorComm?.orderId,
          firstPurchaseCompleted: Boolean(priorComm),
          totalOrdersCount: priorOrders.length + 1,
          totalCommissionedOrdersCount: priorComm ? 1 : 0,
          lastOrderId: order.id,
          createdAt: priorOrders[0]?.createdAt || now,
          updatedAt: now,
        });
      } catch {
        attr = await ReferralAttributionModel.findOne({ customerEmail: normalizedEmail }).lean();
      }
    }

    // Enforce Recurring Purchase Commission setting
    if (!recurringEnabled) {
      const claimedFirstPurchase = await ReferralAttributionModel.findOneAndUpdate(
        { customerEmail: normalizedEmail, firstPurchaseCompleted: false },
        {
          $set: {
            firstPurchaseCompleted: true,
            firstCommissionOrderId: order.id,
            lastOrderId: order.id,
            updatedAt: now,
          },
          $inc: { totalCommissionedOrdersCount: 1 },
        },
        { new: true }
      ).lean();

      if (!claimedFirstPurchase) {
        const reason =
          'Recurring commissions disabled — first-purchase entitlement already used for this referred customer';
        await OrderModel.updateOne(
          { id: order.id },
          { $set: { commissionAwarded: false, commissionSkippedReason: reason } }
        );
        await auditService.addLog(
          'Commission Skipped (Non-Recurring)',
          `Skipped commission for order ${order.id} (${normalizedEmail}): ${reason}`,
          'Affiliate System'
        );
        return;
      }
    } else {
      await ReferralAttributionModel.updateOne(
        { customerEmail: normalizedEmail },
        {
          $set: {
            firstPurchaseCompleted: true,
            lastOrderId: order.id,
            updatedAt: now,
            ...(!attr?.firstCommissionOrderId ? { firstCommissionOrderId: order.id } : {}),
          },
          $inc: { totalCommissionedOrdersCount: 1 },
        }
      );
    }

    // Calculate accurate per-item commission across all products in the order
    let exactCommissionSum = 0;
    const itemRates: number[] = [];
    const baseRate =
      typeof settings.defaultCommissionRate === 'number' && !Number.isNaN(settings.defaultCommissionRate)
        ? settings.defaultCommissionRate
        : 0;

    for (const item of order.items) {
      const product = item.productId
        ? await productService.getProductById(item.productId)
        : null;
      const productOverride =
        product?.commissionRateOverride ?? settings.productCommissionRates?.[item.productId];
      const itemRate =
        typeof productOverride === 'number' && !Number.isNaN(productOverride)
          ? productOverride
          : baseRate;

      itemRates.push(itemRate);
      exactCommissionSum += (item.price * item.quantity * itemRate) / 100;
    }

    const commissionAmount = Math.round(exactCommissionSum);
    if (commissionAmount <= 0) {
      await OrderModel.updateOne(
        { id: order.id },
        {
          $set: {
            commissionAwarded: false,
            commissionSkippedReason: 'No commission rate configured (0%)',
          },
        }
      );
      await auditService.addLog(
        'Commission Skipped (0% Rate)',
        `Skipped commission for order ${order.id}: effective commission rate is 0%.`,
        'Affiliate System'
      );
      return;
    }

    const appliedRate =
      itemRates.length === 1
        ? itemRates[0]
        : order.totalAmount > 0
        ? Math.round((commissionAmount / order.totalAmount) * 10000) / 100
        : baseRate;

    const firstItem = order.items[0];
    const displayProductName =
      order.items.length > 1
        ? `${firstItem?.productName || 'Software'} (+${order.items.length - 1} more)`
        : firstItem?.productName || 'Software Subscription';

    const newCommission: AffiliateCommission = {
      id: `comm-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      affiliateId: affiliate._id,
      orderId: order.id,
      productId: order.items.length === 1 ? firstItem?.productId || 'item' : 'multi-item',
      productName: displayProductName,
      productDuration: order.items.length === 1 ? firstItem?.duration || 'Plan' : `${order.items.length} items`,
      orderAmount: order.totalAmount,
      commissionRate: appliedRate,
      commissionAmount,
      status: 'eligible',
      createdAt: now,
    };

    const updatedAff = await AffiliateModel.findOneAndUpdate(
      { _id: new mongoose.Types.ObjectId(affiliate._id) },
      {
        $inc: {
          availableBalance: commissionAmount,
          totalEarned: commissionAmount,
          totalReferredSalesCount: 1,
        },
        $set: { updatedAt: now },
      },
      { new: false }
    ).lean();

    const balanceBefore = updatedAff?.availableBalance ?? affiliate.availableBalance;
    await Promise.all([
      AffiliateCommissionModel.create(newCommission),
      AffiliateLedgerModel.create({
        id: `led-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        affiliateId: affiliate._id,
        type: 'commission',
        amount: commissionAmount,
        referenceId: order.id,
        description: `Commission (${appliedRate}%) on Order ${order.id}: ${newCommission.productName}`,
        balanceBefore,
        balanceAfter: balanceBefore + commissionAmount,
        createdAt: now,
      }),
      OrderModel.updateOne(
        { id: order.id },
        { $set: { commissionAwarded: true }, $unset: { commissionSkippedReason: 1 } }
      ),
    ]);

    await auditService.addLog(
      'Affiliate Commission Awarded',
      `Affiliate ${affiliate.fullName} earned ₦${commissionAmount} (${appliedRate}%) from order ${order.id}`,
      'System'
    );
  },

  async requestWithdrawal(affiliateId: string, amount: number): Promise<AffiliateWithdrawal> {
    requireDatabaseConnection();
    const settings = await cmsService.getSettings();
    const minAmount = settings.minWithdrawalAmount || 100;

    if (amount < minAmount) {
      throw new ApiError(400, `Minimum withdrawal amount is ₦${minAmount.toLocaleString('en-NG')}.`);
    }

    const affiliate = await this.getAffiliateById(affiliateId);
    if (!affiliate) throw new ApiError(404, 'Affiliate not found');
    if (affiliate.status !== 'active') throw new ApiError(403, 'Affiliate account is not active');
    if (!affiliate.bankName || !affiliate.accountNumber) {
      throw new ApiError(400, 'Please save your bank account details before requesting a withdrawal.');
    }

    const now = new Date().toISOString();
    let withdrawalId = `ZEEK-WTH-${cryptoRandomHex(4)}`;
    while (await AffiliateWithdrawalModel.exists({ id: withdrawalId })) {
      withdrawalId = `ZEEK-WTH-${cryptoRandomHex(4)}`;
    }
    const newWithdrawal: AffiliateWithdrawal = {
      id: withdrawalId,
      affiliateId: affiliate._id,
      affiliateName: affiliate.fullName,
      affiliateEmail: affiliate.email,
      amount,
      bankName: affiliate.bankName,
      accountNumber: affiliate.accountNumber,
      accountName: affiliate.accountName || affiliate.fullName,
      status: 'Pending Review',
      createdAt: now,
      updatedAt: now,
    };

    const updatedBefore = await AffiliateModel.findOneAndUpdate(
      { _id: new mongoose.Types.ObjectId(affiliate._id), availableBalance: { $gte: amount } },
      {
        $inc: {
          availableBalance: -amount,
          reservedWithdrawalBalance: amount,
        },
        $set: { updatedAt: now },
      },
      { new: false }
    ).lean();

    if (!updatedBefore) {
      throw new ApiError(
        400,
        `Requested amount exceeds your available balance of ₦${affiliate.availableBalance.toLocaleString('en-NG')}.`
      );
    }

    await Promise.all([
      AffiliateWithdrawalModel.create(newWithdrawal),
      AffiliateLedgerModel.create({
        id: `led-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        affiliateId: affiliate._id,
        type: 'withdrawal_reserve',
        amount: -amount,
        referenceId: withdrawalId,
        description: `Withdrawal request submitted to ${affiliate.bankName} (${affiliate.accountNumber})`,
        balanceBefore: updatedBefore.availableBalance,
        balanceAfter: updatedBefore.availableBalance - amount,
        createdAt: now,
      }),
    ]);

    await auditService.addLog(
      'Withdrawal Requested',
      `Affiliate ${affiliate.fullName} requested withdrawal of ₦${amount} (${withdrawalId})`,
      affiliate.fullName
    );

    emailService
      .notifyAdminNewWithdrawal({
        affiliateName: affiliate.fullName,
        affiliateEmail: affiliate.email,
        amount,
        bankName: affiliate.bankName,
        accountNumber: affiliate.accountNumber,
        reference: withdrawalId,
        date: now.replace('T', ' ').substring(0, 19),
      })
      .catch(console.error);

    return newWithdrawal;
  },

  async updateWithdrawalStatus(
    withdrawalId: string,
    status: AffiliateWithdrawal['status'],
    data?: {
      transferReference?: string;
      rejectionReason?: string;
      adminNotes?: string;
      adminUser?: string;
    }
  ): Promise<AffiliateWithdrawal> {
    requireDatabaseConnection();
    const existingDoc = await AffiliateWithdrawalModel.findOne({ id: withdrawalId }).lean();
    if (!existingDoc) throw new ApiError(404, 'Withdrawal record not found');

    if (
      (existingDoc.status === 'Declined' || existingDoc.status === 'Withdrawal Successful') &&
      existingDoc.status !== status
    ) {
      throw new ApiError(
        400,
        `Withdrawal ${withdrawalId} is already finalized as "${existingDoc.status}" and cannot transition to "${status}".`
      );
    }

    const affiliate = await this.getAffiliateById(existingDoc.affiliateId);
    if (!affiliate) throw new ApiError(404, 'Associated affiliate not found');

    const now = new Date().toISOString();
    const adminUser = data?.adminUser || 'Admin';

    const updates: Partial<AffiliateWithdrawal> = {
      status,
      updatedAt: now,
      ...(data?.transferReference ? { transferReference: data.transferReference } : {}),
      ...(data?.rejectionReason ? { rejectionReason: data.rejectionReason } : {}),
      ...(data?.adminNotes ? { adminNotes: data.adminNotes } : {}),
      ...(status === 'Withdrawal Successful' && existingDoc.status !== 'Withdrawal Successful'
        ? { paymentDate: now }
        : {}),
    };

    // Atomic conditional update ensures terminal transitions ('Declined' / 'Withdrawal Successful') execute at most once
    const isTerminalTransition = status === 'Declined' || status === 'Withdrawal Successful';
    const filter: Record<string, unknown> = isTerminalTransition
      ? {
          id: withdrawalId,
          status: { $nin: ['Declined', 'Withdrawal Successful'] as AffiliateWithdrawal['status'][] },
        }
      : { id: withdrawalId };

    const preUpdateDoc = await AffiliateWithdrawalModel.findOneAndUpdate(
      filter,
      { $set: updates },
      { new: false }
    ).lean();

    if (!preUpdateDoc) {
      const latest = await AffiliateWithdrawalModel.findOne({ id: withdrawalId }).lean();
      if (!latest) throw new ApiError(404, 'Withdrawal record not found');
      if (latest.status === status) {
        const { _id, ...rest } = latest;
        return rest as AffiliateWithdrawal;
      }
      throw new ApiError(409, `Withdrawal ${withdrawalId} was already updated by another request.`);
    }

    const previousStatus = preUpdateDoc.status;
    const latestDoc = await AffiliateWithdrawalModel.findOne({ id: withdrawalId }).lean();
    const { _id, ...withdrawalRest } = latestDoc!;
    const withdrawal = withdrawalRest as AffiliateWithdrawal;

    if (status === 'Declined' && previousStatus !== 'Declined') {
      const prevAff = await AffiliateModel.findOneAndUpdate(
        { _id: new mongoose.Types.ObjectId(affiliate._id) },
        {
          $inc: {
            availableBalance: withdrawal.amount,
            reservedWithdrawalBalance: -Math.min(
              withdrawal.amount,
              Math.max(0, affiliate.reservedWithdrawalBalance || withdrawal.amount)
            ),
          },
          $set: { updatedAt: now },
        },
        { new: false }
      ).lean();

      const balanceBefore = prevAff?.availableBalance ?? affiliate.availableBalance;
      await AffiliateLedgerModel.create({
        id: `led-${Date.now()}-${cryptoRandomHex(3)}`,
        affiliateId: affiliate._id,
        type: 'withdrawal_declined_refund',
        amount: withdrawal.amount,
        referenceId: withdrawal.id,
        description: `Refund of declined withdrawal ${withdrawal.id}: ${data?.rejectionReason || 'Declined by Admin'}`,
        balanceBefore,
        balanceAfter: balanceBefore + withdrawal.amount,
        adminUser,
        createdAt: now,
      });
    } else if (status === 'Withdrawal Successful' && previousStatus !== 'Withdrawal Successful') {
      await AffiliateModel.updateOne(
        { _id: new mongoose.Types.ObjectId(affiliate._id) },
        {
          $inc: {
            reservedWithdrawalBalance: -Math.min(
              withdrawal.amount,
              Math.max(0, affiliate.reservedWithdrawalBalance || withdrawal.amount)
            ),
            totalWithdrawn: withdrawal.amount,
          },
          $set: { updatedAt: now },
        }
      );
    }

    if (status === 'Declined' && previousStatus !== 'Declined') {
      emailService
        .notifyAffiliateWithdrawalDeclined({
          affiliateName: affiliate.fullName,
          affiliateEmail: affiliate.email,
          amount: withdrawal.amount,
          reference: withdrawal.id,
          reason: data?.rejectionReason || 'Verification check failed',
        })
        .catch(console.error);
    } else if (status === 'Withdrawal Successful' && previousStatus !== 'Withdrawal Successful') {
      const maskedAcc =
        withdrawal.accountNumber.length > 4
          ? `****${withdrawal.accountNumber.slice(-4)}`
          : withdrawal.accountNumber;
      emailService
        .notifyAffiliateWithdrawalSuccess({
          affiliateName: affiliate.fullName,
          affiliateEmail: affiliate.email,
          amount: withdrawal.amount,
          bankName: withdrawal.bankName,
          maskedAccount: maskedAcc,
          reference: withdrawal.id,
          transferReference: data?.transferReference,
        })
        .catch(console.error);
    }

    await auditService.addLog(
      'Withdrawal Status Changed',
      `Withdrawal ${withdrawal.id} changed to ${status} by ${adminUser}`,
      adminUser
    );

    return withdrawal;
  },

  async adjustBalance(
    affiliateId: string,
    type: 'credit' | 'debit',
    amount: number,
    reason: string,
    adminUser = 'Admin'
  ): Promise<Affiliate> {
    requireDatabaseConnection();
    if (amount <= 0) throw new ApiError(400, 'Adjustment amount must be greater than zero');
    const affiliate = await this.getAffiliateById(affiliateId);
    if (!affiliate) throw new ApiError(404, 'Affiliate not found');

    const now = new Date().toISOString();
    const affObjId = new mongoose.Types.ObjectId(affiliate._id);
    const filter =
      type === 'debit'
        ? { _id: affObjId, availableBalance: { $gte: amount } }
        : { _id: affObjId };
    const incPayload =
      type === 'credit'
        ? { availableBalance: amount, totalEarned: amount }
        : { availableBalance: -amount };

    const prevDoc = await AffiliateModel.findOneAndUpdate(
      filter,
      { $inc: incPayload, $set: { updatedAt: now } },
      { new: false }
    ).lean();

    if (!prevDoc) {
      throw new ApiError(
        400,
        `Cannot debit ₦${amount}. Affiliate available balance is only ₦${affiliate.availableBalance}.`
      );
    }

    const balanceBefore = prevDoc.availableBalance;
    const balanceAfter = type === 'credit' ? balanceBefore + amount : balanceBefore - amount;

    await AffiliateLedgerModel.create({
      id: `led-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      affiliateId: affiliate._id,
      type: type === 'credit' ? 'admin_credit' : 'admin_debit',
      amount: type === 'credit' ? amount : -amount,
      description: `Admin Manual ${type.toUpperCase()}: ${reason}`,
      balanceBefore,
      balanceAfter,
      adminUser,
      createdAt: now,
    });

    await auditService.addLog(
      `Affiliate Balance ${type.toUpperCase()}`,
      `Admin ${adminUser} ${type}ed ₦${amount} to ${affiliate.fullName}. Reason: ${reason}`,
      adminUser
    );

    const updated = await this.getAffiliateById(affiliate._id);
    return updated!;
  },

  async getCommissions(affiliateId?: string): Promise<AffiliateCommission[]> {
    requireDatabaseConnection();
    const filter = affiliateId ? { affiliateId } : {};
    const docs = await AffiliateCommissionModel.find(filter).sort({ createdAt: -1 }).lean();
    return docs.map(({ _id, ...rest }) => rest as AffiliateCommission);
  },

  async getWithdrawals(affiliateId?: string): Promise<AffiliateWithdrawal[]> {
    requireDatabaseConnection();
    const filter = affiliateId ? { affiliateId } : {};
    const docs = await AffiliateWithdrawalModel.find(filter).sort({ createdAt: -1 }).lean();
    return docs.map(({ _id, ...rest }) => rest as AffiliateWithdrawal);
  },

  async getLedger(affiliateId?: string): Promise<AffiliateLedgerEntry[]> {
    requireDatabaseConnection();
    const filter = affiliateId ? { affiliateId } : {};
    const docs = await AffiliateLedgerModel.find(filter).sort({ createdAt: -1 }).lean();
    return docs.map(({ _id, ...rest }) => rest as AffiliateLedgerEntry);
  },

  async getReferredCustomers(affiliateId?: string): Promise<ReferralAttribution[]> {
    requireDatabaseConnection();
    const filter = affiliateId ? { affiliateId } : {};
    const docs = await ReferralAttributionModel.find(filter).sort({ updatedAt: -1 }).lean();
    return docs.map(({ _id, ...rest }) => rest as ReferralAttribution);
  },

  async getAffiliateDashboard(affiliateId: string) {
    requireDatabaseConnection();
    const affiliate = await this.getAffiliateById(affiliateId);
    if (!affiliate) throw new ApiError(404, 'Affiliate not found');

    const [commissions, withdrawals, ledger, referredCustomers] = await Promise.all([
      this.getCommissions(affiliate._id),
      this.getWithdrawals(affiliate._id),
      this.getLedger(affiliate._id),
      this.getReferredCustomers(affiliate._id),
    ]);

    return {
      affiliate,
      commissions,
      withdrawals,
      ledger,
      referredCustomers,
    };
  },
};
