import { Db } from 'mongodb';
import {
  Affiliate,
  ReferralClick,
  AffiliateCommission,
  AffiliateWithdrawal,
  AffiliateLedgerEntry,
} from '../../src/types';

export class AffiliateRepository {
  constructor(private getDb: () => Db | null) {}

  private get affiliatesCol() {
    const db = this.getDb();
    if (!db) throw new Error('Database not connected');
    return db.collection<Affiliate>('affiliates');
  }

  private get clicksCol() {
    const db = this.getDb();
    if (!db) throw new Error('Database not connected');
    return db.collection<ReferralClick>('referral_clicks');
  }

  private get commissionsCol() {
    const db = this.getDb();
    if (!db) throw new Error('Database not connected');
    return db.collection<AffiliateCommission>('affiliate_commissions');
  }

  private get withdrawalsCol() {
    const db = this.getDb();
    if (!db) throw new Error('Database not connected');
    return db.collection<AffiliateWithdrawal>('affiliate_withdrawals');
  }

  private get ledgerCol() {
    const db = this.getDb();
    if (!db) throw new Error('Database not connected');
    return db.collection<AffiliateLedgerEntry>('affiliate_ledger');
  }

  // --- Affiliates CRUD ---

  async getAll(): Promise<Affiliate[]> {
    return this.affiliatesCol.find({}).sort({ createdAt: -1 }).toArray();
  }

  async getById(id: string): Promise<Affiliate | null> {
    return this.affiliatesCol.findOne({ _id: id });
  }

  async getByEmail(email: string): Promise<Affiliate | null> {
    return this.affiliatesCol.findOne({ email: email.trim().toLowerCase() });
  }

  async getByReferralCode(code: string): Promise<Affiliate | null> {
    return this.affiliatesCol.findOne({ referralCode: code.trim().toUpperCase() });
  }

  async create(affiliate: Affiliate): Promise<Affiliate> {
    await this.affiliatesCol.insertOne(affiliate);
    return affiliate;
  }

  async update(id: string, updates: Partial<Affiliate>): Promise<Affiliate | null> {
    const res = await this.affiliatesCol.findOneAndUpdate(
      { _id: id },
      {
        $set: {
          ...updates,
          updatedAt: new Date().toISOString(),
        },
      },
      { returnDocument: 'after' }
    );
    return res || null;
  }

  // --- Referral Clicks ---

  async recordClick(click: ReferralClick): Promise<void> {
    await this.clicksCol.insertOne(click);
    await this.affiliatesCol.updateOne(
      { _id: click.affiliateId },
      { $inc: { totalClicks: 1 } }
    );
  }

  async getClicks(affiliateId?: string): Promise<ReferralClick[]> {
    const query = affiliateId ? { affiliateId } : {};
    return this.clicksCol.find(query).sort({ timestamp: -1 }).toArray();
  }

  // --- Commissions & Atomic Balance Credit ---

  async awardCommission(commission: AffiliateCommission, appliedRate: number): Promise<boolean> {
    // 1. Prevent duplicate commission awarding
    const existing = await this.commissionsCol.findOne({ orderId: commission.orderId });
    if (existing) {
      return false;
    }

    // 2. Insert commission record
    await this.commissionsCol.insertOne(commission);

    // 3. Atomically update affiliate balances
    const aff = await this.affiliatesCol.findOneAndUpdate(
      { _id: commission.affiliateId },
      {
        $inc: {
          availableBalance: commission.commissionAmount,
          totalEarned: commission.commissionAmount,
          totalReferredSalesCount: 1,
        },
        $set: {
          updatedAt: new Date().toISOString(),
        },
      },
      { returnDocument: 'after' }
    );

    if (aff) {
      // 4. Create immutable ledger entry
      await this.ledgerCol.insertOne({
        id: `led-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        affiliateId: aff._id,
        type: 'commission',
        amount: commission.commissionAmount,
        referenceId: commission.orderId,
        description: `Commission (${appliedRate}%) on Order ${commission.orderId}: ${commission.productName}`,
        balanceBefore: aff.availableBalance - commission.commissionAmount,
        balanceAfter: aff.availableBalance,
        createdAt: new Date().toISOString(),
      });
    }

    return true;
  }

  async getCommissions(affiliateId?: string): Promise<AffiliateCommission[]> {
    const query = affiliateId ? { affiliateId } : {};
    return this.commissionsCol.find(query).sort({ createdAt: -1 }).toArray();
  }

  // --- Withdrawals & Atomic Lock / Refund ---

  async requestWithdrawal(
    affiliateId: string,
    amount: number,
    minAmount: number
  ): Promise<AffiliateWithdrawal> {
    if (amount < minAmount) {
      throw new Error(`Minimum withdrawal amount is ₦${minAmount.toLocaleString('en-NG')}.`);
    }

    // Atomically decrement availableBalance only if it is >= requested amount
    const aff = await this.affiliatesCol.findOneAndUpdate(
      {
        _id: affiliateId,
        status: 'active',
        availableBalance: { $gte: amount },
      },
      {
        $inc: {
          availableBalance: -amount,
          reservedWithdrawalBalance: amount,
        },
        $set: {
          updatedAt: new Date().toISOString(),
        },
      },
      { returnDocument: 'after' }
    );

    if (!aff) {
      throw new Error('Insufficient balance or affiliate account is not active.');
    }

    if (!aff.bankName || !aff.accountNumber) {
      // Revert lock
      await this.affiliatesCol.updateOne(
        { _id: affiliateId },
        {
          $inc: {
            availableBalance: amount,
            reservedWithdrawalBalance: -amount,
          },
        }
      );
      throw new Error('Please save your Nigerian bank account details before requesting a withdrawal.');
    }

    const randomSuffix = Math.floor(100000 + Math.random() * 900000);
    const withdrawalId = `ZEEK-WTH-${randomSuffix}`;

    const newWithdrawal: AffiliateWithdrawal = {
      id: withdrawalId,
      affiliateId: aff._id,
      affiliateName: aff.fullName,
      affiliateEmail: aff.email,
      amount,
      bankName: aff.bankName,
      accountNumber: aff.accountNumber,
      accountName: aff.accountName,
      status: 'Pending Review',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await this.withdrawalsCol.insertOne(newWithdrawal);

    // Ledger record
    await this.ledgerCol.insertOne({
      id: `led-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      affiliateId: aff._id,
      type: 'withdrawal_reserve',
      amount: -amount,
      referenceId: withdrawalId,
      description: `Withdrawal request submitted to ${aff.bankName} (${aff.accountNumber})`,
      balanceBefore: aff.availableBalance + amount,
      balanceAfter: aff.availableBalance,
      createdAt: new Date().toISOString(),
    });

    return newWithdrawal;
  }

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
    const withdrawal = await this.withdrawalsCol.findOne({ id: withdrawalId });
    if (!withdrawal) throw new Error('Withdrawal record not found');

    const previousStatus = withdrawal.status;

    // Handle Decline: Refund reserved balance back to available balance
    if (status === 'Declined' && previousStatus !== 'Declined') {
      const aff = await this.affiliatesCol.findOneAndUpdate(
        { _id: withdrawal.affiliateId },
        {
          $inc: {
            availableBalance: withdrawal.amount,
            reservedWithdrawalBalance: -withdrawal.amount,
          },
          $set: { updatedAt: new Date().toISOString() },
        },
        { returnDocument: 'after' }
      );

      if (aff) {
        await this.ledgerCol.insertOne({
          id: `led-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          affiliateId: aff._id,
          type: 'withdrawal_declined_refund',
          amount: withdrawal.amount,
          referenceId: withdrawal.id,
          description: `Refund of declined withdrawal ${withdrawal.id}: ${data?.rejectionReason || 'Declined by Admin'}`,
          balanceBefore: aff.availableBalance - withdrawal.amount,
          balanceAfter: aff.availableBalance,
          adminUser: data?.adminUser || 'Admin',
          createdAt: new Date().toISOString(),
        });
      }
    } else if (status === 'Withdrawal Successful' && previousStatus !== 'Withdrawal Successful') {
      // Payout confirmed: deduct from reserved, increment totalWithdrawn
      await this.affiliatesCol.updateOne(
        { _id: withdrawal.affiliateId },
        {
          $inc: {
            reservedWithdrawalBalance: -withdrawal.amount,
            totalWithdrawn: withdrawal.amount,
          },
          $set: { updatedAt: new Date().toISOString() },
        }
      );
    }

    const updated = await this.withdrawalsCol.findOneAndUpdate(
      { id: withdrawalId },
      {
        $set: {
          status,
          updatedAt: new Date().toISOString(),
          ...(status === 'Withdrawal Successful' ? { paymentDate: new Date().toISOString() } : {}),
          ...(data?.transferReference ? { transferReference: data.transferReference } : {}),
          ...(data?.rejectionReason ? { rejectionReason: data.rejectionReason } : {}),
          ...(data?.adminNotes ? { adminNotes: data.adminNotes } : {}),
        },
      },
      { returnDocument: 'after' }
    );

    return updated!;
  }

  async getWithdrawals(affiliateId?: string): Promise<AffiliateWithdrawal[]> {
    const query = affiliateId ? { affiliateId } : {};
    return this.withdrawalsCol.find(query).sort({ createdAt: -1 }).toArray();
  }

  async getLedger(affiliateId?: string): Promise<AffiliateLedgerEntry[]> {
    const query = affiliateId ? { affiliateId } : {};
    return this.ledgerCol.find(query).sort({ createdAt: -1 }).toArray();
  }

  async adjustBalance(
    affiliateId: string,
    type: 'credit' | 'debit',
    amount: number,
    reason: string,
    adminUser = 'Admin'
  ): Promise<Affiliate> {
    if (amount <= 0) throw new Error('Adjustment amount must be positive');

    const updateQuery =
      type === 'credit'
        ? {
            $inc: { availableBalance: amount, totalEarned: amount },
            $set: { updatedAt: new Date().toISOString() },
          }
        : {
            $inc: { availableBalance: -amount },
            $set: { updatedAt: new Date().toISOString() },
          };

    const filterQuery =
      type === 'credit'
        ? { _id: affiliateId }
        : { _id: affiliateId, availableBalance: { $gte: amount } };

    const aff = await this.affiliatesCol.findOneAndUpdate(
      filterQuery,
      updateQuery,
      { returnDocument: 'after' }
    );

    if (!aff) {
      throw new Error(`Cannot debit ₦${amount}. Affiliate balance is insufficient.`);
    }

    const balanceBefore = type === 'credit' ? aff.availableBalance - amount : aff.availableBalance + amount;

    await this.ledgerCol.insertOne({
      id: `led-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      affiliateId: aff._id,
      type: type === 'credit' ? 'admin_credit' : 'admin_debit',
      amount: type === 'credit' ? amount : -amount,
      description: `Admin Manual ${type.toUpperCase()}: ${reason}`,
      balanceBefore,
      balanceAfter: aff.availableBalance,
      adminUser,
      createdAt: new Date().toISOString(),
    });

    return aff;
  }

  async seedAll(data: {
    affiliates?: Affiliate[];
    referralClicks?: ReferralClick[];
    affiliateCommissions?: AffiliateCommission[];
    affiliateWithdrawals?: AffiliateWithdrawal[];
    affiliateLedger?: AffiliateLedgerEntry[];
  }): Promise<void> {
    if (data.affiliates) {
      for (const a of data.affiliates) {
        await this.affiliatesCol.updateOne({ _id: a._id }, { $setOnInsert: a }, { upsert: true });
      }
    }
    if (data.referralClicks) {
      for (const c of data.referralClicks) {
        await this.clicksCol.updateOne({ id: c.id }, { $setOnInsert: c }, { upsert: true });
      }
    }
    if (data.affiliateCommissions) {
      for (const cm of data.affiliateCommissions) {
        await this.commissionsCol.updateOne({ id: cm.id }, { $setOnInsert: cm }, { upsert: true });
      }
    }
    if (data.affiliateWithdrawals) {
      for (const w of data.affiliateWithdrawals) {
        await this.withdrawalsCol.updateOne({ id: w.id }, { $setOnInsert: w }, { upsert: true });
      }
    }
    if (data.affiliateLedger) {
      for (const l of data.affiliateLedger) {
        await this.ledgerCol.updateOne({ id: l.id }, { $setOnInsert: l }, { upsert: true });
      }
    }
  }
}
