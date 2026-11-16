import {
  CampaignTargetType,
  DailyAutomationConfig,
  DailyEmailDayConfig,
  DayOfWeekKey,
  EmailBrandingConfig,
  EmailCampaign,
  EmailContact,
  EmailSendLog,
} from '../types';
import {
  DailyAutomationConfigModel,
  EmailCampaignModel,
  EmailContactModel,
  EmailSendLogModel,
  OrderModel,
  SiteSettingsModel,
} from '../models';
import { requireDatabaseConnection, isDatabaseConnected } from '../config/database';
import { ApiError } from '../utils/ApiError';
import {
  DEFAULT_EMAIL_BRANDING,
  getDefaultDailyAutomationConfig,
} from '../utils/seedData';
import { auditService } from './audit.service';
import { buildBrandedEmailContent, emailService, getPublicAppUrl } from './email.service';
import {
  emailContactService,
  isValidEmailFormat,
  normalizeEmail,
} from './emailContact.service';
import { isSafeHttpUrl } from '../utils/security';

const DAY_KEYS: DayOfWeekKey[] = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
];

let schedulerTimer: ReturnType<typeof setInterval> | null = null;
let isQueueTickRunning = false;

const getLocalDateParts = (timezone = 'Africa/Lagos', date = new Date()) => {
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      weekday: 'long',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    const parts = formatter.formatToParts(date);
    const get = (type: string) => parts.find((p) => p.type === type)?.value || '';
    const weekday = get('weekday').toLowerCase() as DayOfWeekKey;
    return {
      dateStr: `${get('year')}-${get('month')}-${get('day')}`,
      timeStr: `${get('hour')}:${get('minute')}`,
      dayKey: DAY_KEYS.includes(weekday) ? weekday : DAY_KEYS[date.getDay()],
    };
  } catch {
    const iso = date.toISOString();
    return {
      dateStr: iso.slice(0, 10),
      timeStr: iso.slice(11, 16),
      dayKey: DAY_KEYS[date.getDay()],
    };
  }
};

const getRateLimits = async () => {
  const settings = await SiteSettingsModel.findOne({ key: 'site_settings' }).lean();
  const eb = { ...DEFAULT_EMAIL_BRANDING, ...(settings?.emailBranding || {}) };
  return {
    batchSize: Math.max(1, Math.min(100, eb.batchSize || 20)),
    batchDelayMs: Math.max(200, Math.min(10000, eb.batchDelayMs || 1500)),
    dailySendLimit: Math.max(10, Math.min(5000, eb.dailySendLimit || 280)),
  };
};

const getTodayUtcSentCount = async (): Promise<number> => {
  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);
  return EmailSendLogModel.countDocuments({
    sentAt: { $gte: startOfDay.toISOString() },
    status: { $in: ['sent', 'delivered', 'bounced'] },
  });
};

const isBounceErrorMessage = (msg: string): boolean =>
  /bounce|mailbox.*unavailable|user unknown|does not exist|invalid.*recipient|550\s|552\s|blocked/i.test(
    msg
  );

export const emailMarketingService = {
  async ensureDailyAutomationConfig(): Promise<DailyAutomationConfig> {
    requireDatabaseConnection();
    const existing = await DailyAutomationConfigModel.findOne({ key: 'daily_automation' }).lean();
    const defaults = getDefaultDailyAutomationConfig();
    if (!existing) {
      await DailyAutomationConfigModel.create(defaults);
      return defaults;
    }

    const mergedDays = { ...defaults.days };
    for (const day of Object.keys(defaults.days) as DayOfWeekKey[]) {
      if (existing.days && existing.days[day]) {
        mergedDays[day] = {
          ...defaults.days[day],
          ...existing.days[day],
        };
      }
    }

    return {
      key: 'daily_automation',
      enabled: Boolean(existing.enabled),
      sendTime: existing.sendTime || defaults.sendTime,
      timezone: existing.timezone || defaults.timezone,
      targetCategories:
        Array.isArray(existing.targetCategories) && existing.targetCategories.length > 0
          ? existing.targetCategories
          : defaults.targetCategories,
      days: mergedDays,
      updatedAt: existing.updatedAt || defaults.updatedAt,
    };
  },

  async updateDailyAutomationConfig(
    updates: Partial<DailyAutomationConfig>
  ): Promise<DailyAutomationConfig> {
    requireDatabaseConnection();
    const current = await this.ensureDailyAutomationConfig();
    const nextDays = { ...current.days };

    if (updates.days) {
      for (const day of Object.keys(current.days) as DayOfWeekKey[]) {
        if (updates.days[day]) {
          nextDays[day] = {
            ...current.days[day],
            ...updates.days[day],
            day,
          } as DailyEmailDayConfig;
        }
      }
    }

    const nextConfig: DailyAutomationConfig = {
      key: 'daily_automation',
      enabled: typeof updates.enabled === 'boolean' ? updates.enabled : current.enabled,
      sendTime: updates.sendTime || current.sendTime,
      timezone: updates.timezone || current.timezone,
      targetCategories: Array.isArray(updates.targetCategories)
        ? updates.targetCategories
        : current.targetCategories,
      days: nextDays,
      updatedAt: new Date().toISOString(),
    };

    await DailyAutomationConfigModel.updateOne(
      { key: 'daily_automation' },
      { $set: nextConfig },
      { upsert: true }
    );

    await auditService.addLog(
      'Daily Email Automation Updated',
      `Updated daily automation (Master: ${nextConfig.enabled ? 'ON' : 'OFF'}, Send time: ${
        nextConfig.sendTime
      } ${nextConfig.timezone})`,
      'Admin'
    );

    return nextConfig;
  },

  async resolveRecipients(params: {
    targetType: CampaignTargetType;
    targetCategories?: string[];
    targetProductIds?: string[];
    inactiveDays?: number;
    neverPurchasedOnly?: boolean;
    targetEmails?: string[];
  }): Promise<Array<{ email: string; fullName: string; unsubscribeToken: string }>> {
    requireDatabaseConnection();

    if (params.targetType === 'individuals') {
      const requestedEmails = Array.from(
        new Set(
          (params.targetEmails || [])
            .map((e) => normalizeEmail(e))
            .filter((e) => isValidEmailFormat(e))
        )
      );
      if (requestedEmails.length === 0) return [];

      const contacts = await EmailContactModel.find({
        email: { $in: requestedEmails },
        marketingConsent: 'subscribed',
      }).lean();
      const map = new Map<string, EmailContact>();
      for (const c of contacts) map.set(c.email, c as EmailContact);

      const recipients: Array<{ email: string; fullName: string; unsubscribeToken: string }> = [];
      for (const em of requestedEmails) {
        const existing = map.get(em);
        if (existing) {
          recipients.push({
            email: existing.email,
            fullName: existing.fullName || '',
            unsubscribeToken: existing.unsubscribeToken,
          });
        }
      }
      return recipients;
    }

    // Strict promotional compliance mode: only send promotional campaigns/automation to subscribed contacts
    const query: Record<string, unknown> = {
      marketingConsent: 'subscribed',
    };

    if (params.targetType === 'categories') {
      const cats = (params.targetCategories || []).filter(Boolean);
      if (cats.length > 0 && !cats.includes('All Contacts')) {
        query.categories = { $in: cats };
      }
    } else if (params.targetType === 'segments') {
      const andClauses: Record<string, unknown>[] = [];
      const cats = (params.targetCategories || []).filter(Boolean);
      if (cats.length > 0 && !cats.includes('All Contacts')) {
        andClauses.push({ categories: { $in: cats } });
      }
      if (params.targetProductIds && params.targetProductIds.length > 0) {
        andClauses.push({ purchasedProductIds: { $in: params.targetProductIds } });
      }
      if (params.neverPurchasedOnly) {
        andClauses.push({ paidOrderCount: 0 });
      }
      if (typeof params.inactiveDays === 'number' && params.inactiveDays > 0) {
        const cutoff = new Date(Date.now() - params.inactiveDays * 86_400_000).toISOString();
        andClauses.push({
          $or: [
            { paidOrderCount: { $gt: 0 }, lastPurchaseAt: { $lte: cutoff } },
            { paidOrderCount: 0 },
          ],
        });
      }
      if (andClauses.length > 0) {
        query.$and = andClauses;
      }
    }

    const docs = await EmailContactModel.find(query).lean();
    return docs.map((c) => ({
      email: c.email,
      fullName: c.fullName || '',
      unsubscribeToken: c.unsubscribeToken,
    }));
  },

  async estimateAudience(params: {
    targetType: CampaignTargetType;
    targetCategories?: string[];
    targetProductIds?: string[];
    inactiveDays?: number;
    neverPurchasedOnly?: boolean;
    targetEmails?: string[];
  }) {
    const subscribedRecipients = await this.resolveRecipients(params);

    let matchingNonSuppressed = 0;

    if (params.targetType === 'individuals') {
      const requestedEmails = Array.from(
        new Set(
          (params.targetEmails || [])
            .map((e) => normalizeEmail(e))
            .filter((e) => isValidEmailFormat(e))
        )
      );
      if (requestedEmails.length > 0) {
        const blockedDocs = await EmailContactModel.find(
          {
            email: { $in: requestedEmails },
            marketingConsent: { $in: ['unsubscribed', 'suppressed'] },
          },
          { email: 1 }
        ).lean();
        const blockedSet = new Set(blockedDocs.map((d) => d.email));
        matchingNonSuppressed = requestedEmails.filter((e) => !blockedSet.has(e)).length;
      }
    } else {
      // Also compute total matching non-unsubscribed contacts so Admin understands why any pending contacts are skipped
      const allQuery: Record<string, unknown> = {
        marketingConsent: { $nin: ['unsubscribed', 'suppressed'] },
      };
      if (
        params.targetType === 'categories' &&
        params.targetCategories?.length &&
        !params.targetCategories.includes('All Contacts')
      ) {
        allQuery.categories = { $in: params.targetCategories };
      } else if (params.targetType === 'segments') {
        const andClauses: Record<string, unknown>[] = [];
        const cats = (params.targetCategories || []).filter(Boolean);
        if (cats.length > 0 && !cats.includes('All Contacts')) {
          andClauses.push({ categories: { $in: cats } });
        }
        if (params.targetProductIds && params.targetProductIds.length > 0) {
          andClauses.push({ purchasedProductIds: { $in: params.targetProductIds } });
        }
        if (params.neverPurchasedOnly) {
          andClauses.push({ paidOrderCount: 0 });
        }
        if (typeof params.inactiveDays === 'number' && params.inactiveDays > 0) {
          const cutoff = new Date(Date.now() - params.inactiveDays * 86_400_000).toISOString();
          andClauses.push({
            $or: [
              { paidOrderCount: { $gt: 0 }, lastPurchaseAt: { $lte: cutoff } },
              { paidOrderCount: 0 },
            ],
          });
        }
        if (andClauses.length > 0) {
          allQuery.$and = andClauses;
        }
      }
      matchingNonSuppressed = await EmailContactModel.countDocuments(allQuery);
    }

    return {
      eligibleCount: subscribedRecipients.length,
      pendingExcludedCount: Math.max(0, matchingNonSuppressed - subscribedRecipients.length),
      sampleRecipients: subscribedRecipients.slice(0, 5).map((r) => ({
        email: r.email,
        fullName: r.fullName,
      })),
    };
  },

  async listCampaigns(): Promise<EmailCampaign[]> {
    requireDatabaseConnection();
    const docs = await EmailCampaignModel.find().sort({ createdAt: -1 }).lean();
    return docs.map(({ _id, ...rest }) => rest as EmailCampaign);
  },

  async getCampaignById(id: string): Promise<EmailCampaign | null> {
    requireDatabaseConnection();
    const doc = await EmailCampaignModel.findOne({ id }).lean();
    if (!doc) return null;
    const { _id, ...rest } = doc;
    return rest as EmailCampaign;
  },

  async saveCampaign(input: {
    id?: string;
    name: string;
    subject: string;
    preheader?: string;
    htmlBody: string;
    bannerImageUrl?: string;
    ctaLabel?: string;
    ctaUrl?: string;
    targetType: CampaignTargetType;
    targetCategories?: string[];
    targetProductIds?: string[];
    inactiveDays?: number;
    neverPurchasedOnly?: boolean;
    targetEmails?: string[];
    scheduledFor?: string;
    action?: 'save_draft' | 'schedule' | 'send_now';
    createdBy?: string;
  }): Promise<EmailCampaign> {
    requireDatabaseConnection();
    const now = new Date().toISOString();

    if (!input.name?.trim() || !input.subject?.trim() || !input.htmlBody?.trim()) {
      throw new ApiError(400, 'Campaign name, subject, and email content are required.');
    }

    const recipients = await this.resolveRecipients({
      targetType: input.targetType,
      targetCategories: input.targetCategories,
      targetProductIds: input.targetProductIds,
      inactiveDays: input.inactiveDays,
      neverPurchasedOnly: input.neverPurchasedOnly,
      targetEmails: input.targetEmails,
    });

    if (input.action === 'send_now' && recipients.length === 0) {
      throw new ApiError(
        400,
        'No eligible consented recipients matched your selection. Contacts must have subscribed marketing consent (or target specific individual emails).'
      );
    }

    if (input.action === 'schedule') {
      if (!input.scheduledFor || Number.isNaN(Date.parse(input.scheduledFor))) {
        throw new ApiError(400, 'Please provide a valid future date and time for scheduled campaigns.');
      }
      if (Date.parse(input.scheduledFor) < Date.now() - 60_000) {
        throw new ApiError(400, 'Scheduled send time must be in the future.');
      }
    }

    const existing = input.id ? await EmailCampaignModel.findOne({ id: input.id }).lean() : null;
    const campaignId =
      existing?.id || `cmp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    const status =
      input.action === 'send_now'
        ? 'queued'
        : input.action === 'schedule'
        ? 'scheduled'
        : existing?.status && ['sending', 'queued', 'completed'].includes(existing.status)
        ? existing.status
        : 'draft';

    const campaignData: EmailCampaign = {
      id: campaignId,
      name: input.name.trim(),
      subject: input.subject.trim(),
      preheader: input.preheader?.trim() || undefined,
      htmlBody: input.htmlBody,
      bannerImageUrl: input.bannerImageUrl?.trim() || undefined,
      ctaLabel: input.ctaLabel?.trim() || undefined,
      ctaUrl: input.ctaUrl?.trim() || undefined,
      targetType: input.targetType,
      targetCategories: input.targetCategories || [],
      targetProductIds: input.targetProductIds || [],
      inactiveDays: input.inactiveDays,
      neverPurchasedOnly: Boolean(input.neverPurchasedOnly),
      targetEmails: (input.targetEmails || []).map(normalizeEmail).filter(isValidEmailFormat),
      status,
      scheduledFor:
        input.action === 'schedule' ? new Date(input.scheduledFor!).toISOString() : input.scheduledFor,
      totalRecipients: recipients.length,
      sentCount: existing?.sentCount || 0,
      deliveredCount: existing?.deliveredCount || 0,
      failedCount: existing?.failedCount || 0,
      bouncedCount: existing?.bouncedCount || 0,
      openCount: existing?.openCount || 0,
      clickCount: existing?.clickCount || 0,
      unsubscribeCount: existing?.unsubscribeCount || 0,
      startedAt: input.action === 'send_now' ? existing?.startedAt || now : existing?.startedAt,
      createdBy: existing?.createdBy || input.createdBy || 'Admin',
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    };

    await EmailCampaignModel.updateOne(
      { id: campaignId },
      { $set: campaignData },
      { upsert: true }
    );

    if (input.action === 'send_now') {
      await this.enqueueCampaignLogs(campaignId, recipients, campaignData.subject);
      await auditService.addLog(
        'Bulk Campaign Queued',
        `Queued campaign "${campaignData.name}" for ${recipients.length} recipient(s)`,
        input.createdBy || 'Admin'
      );
      // Trigger immediate background tick without blocking response long
      setTimeout(() => {
        this.processPendingQueueTick().catch(console.error);
      }, 100);
    } else if (input.action === 'schedule') {
      await auditService.addLog(
        'Campaign Scheduled',
        `Scheduled campaign "${campaignData.name}" for ${campaignData.scheduledFor} (${recipients.length} recipient(s))`,
        input.createdBy || 'Admin'
      );
    }

    return campaignData;
  },

  async enqueueCampaignLogs(
    campaignId: string,
    recipients: Array<{ email: string; fullName: string }>,
    subject: string
  ) {
    const now = new Date().toISOString();
    const ops = recipients.map((r) => ({
      updateOne: {
        filter: { campaignId, recipientEmail: r.email },
        update: {
          $setOnInsert: {
            id: `esl-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
            campaignId,
            sendType: 'campaign' as const,
            recipientEmail: r.email,
            recipientName: r.fullName,
            subject,
            status: 'queued' as const,
            attempts: 0,
            maxAttempts: 3,
            openCount: 0,
            clickCount: 0,
            createdAt: now,
            updatedAt: now,
          },
        },
        upsert: true,
      },
    }));

    if (ops.length > 0) {
      await EmailSendLogModel.bulkWrite(ops, { ordered: false }).catch(() => {});
    }
  },

  async updateCampaignAction(
    campaignId: string,
    action: 'pause' | 'resume' | 'cancel' | 'send_now' | 'delete'
  ): Promise<EmailCampaign | null> {
    requireDatabaseConnection();
    const campaign = await EmailCampaignModel.findOne({ id: campaignId }).lean();
    if (!campaign) throw new ApiError(404, 'Campaign not found.');

    if (action === 'delete') {
      if (campaign.status === 'sending') {
        throw new ApiError(400, 'Pause or cancel the campaign before deleting it.');
      }
      await Promise.all([
        EmailCampaignModel.deleteOne({ id: campaignId }),
        EmailSendLogModel.deleteMany({ campaignId }),
      ]);
      return null;
    }

    const now = new Date().toISOString();
    if (action === 'pause') {
      const updated = await EmailCampaignModel.findOneAndUpdate(
        { id: campaignId },
        { $set: { status: 'paused', updatedAt: now } },
        { new: true }
      ).lean();
      const { _id, ...rest } = updated!;
      return rest as EmailCampaign;
    }

    if (action === 'cancel') {
      await EmailSendLogModel.updateMany(
        { campaignId, status: 'queued' },
        { $set: { status: 'failed', error: 'Campaign cancelled by Admin', updatedAt: now } }
      );
      const updated = await EmailCampaignModel.findOneAndUpdate(
        { id: campaignId },
        { $set: { status: 'cancelled', completedAt: now, updatedAt: now } },
        { new: true }
      ).lean();
      const { _id, ...rest } = updated!;
      return rest as EmailCampaign;
    }

    // resume or send_now
    const recipients = await this.resolveRecipients({
      targetType: campaign.targetType,
      targetCategories: campaign.targetCategories,
      targetProductIds: campaign.targetProductIds,
      inactiveDays: campaign.inactiveDays,
      neverPurchasedOnly: campaign.neverPurchasedOnly,
      targetEmails: campaign.targetEmails,
    });
    if (action === 'send_now' && recipients.length === 0) {
      throw new ApiError(400, 'No consented recipients available for this campaign.');
    }

    if (action === 'send_now') {
      await this.enqueueCampaignLogs(campaignId, recipients, campaign.subject);
    }

    const updated = await EmailCampaignModel.findOneAndUpdate(
      { id: campaignId },
      {
        $set: {
          status: 'queued',
          totalRecipients: Math.max(campaign.totalRecipients || 0, recipients.length),
          startedAt: campaign.startedAt || now,
          updatedAt: now,
        },
      },
      { new: true }
    ).lean();

    setTimeout(() => {
      this.processPendingQueueTick().catch(console.error);
    }, 100);

    const { _id, ...rest } = updated!;
    return rest as EmailCampaign;
  },

  async previewEmail(input: {
    subject: string;
    greeting?: string;
    bodyHtml: string;
    imageUrl?: string;
    ctaLabel?: string;
    ctaUrl?: string;
    preheader?: string;
    sampleName?: string;
  }) {
    return buildBrandedEmailContent({
      subject: input.subject || 'Email Preview',
      greeting: input.greeting,
      bodyHtml: input.bodyHtml || '<p>Email content preview</p>',
      imageUrl: input.imageUrl,
      ctaLabel: input.ctaLabel,
      ctaUrl: input.ctaUrl,
      preheader: input.preheader,
      recipientName: input.sampleName || 'Ezekiel',
      isPromotional: true,
      unsubscribeToken: 'preview-token',
    });
  },

  async sendTestEmail(input: {
    to: string;
    subject: string;
    greeting?: string;
    bodyHtml: string;
    imageUrl?: string;
    ctaLabel?: string;
    ctaUrl?: string;
    preheader?: string;
    sampleName?: string;
  }) {
    const cleanTo = normalizeEmail(input.to);
    if (!isValidEmailFormat(cleanTo)) {
      throw new ApiError(400, 'Please provide a valid test recipient email address.');
    }

    const result = await emailService.sendBrandedEmail({
      to: cleanTo,
      recipientName: input.sampleName || 'Admin Tester',
      subject: `[TEST] ${input.subject}`,
      greeting: input.greeting,
      bodyHtml: input.bodyHtml,
      imageUrl: input.imageUrl,
      ctaLabel: input.ctaLabel,
      ctaUrl: input.ctaUrl,
      preheader: input.preheader,
      isPromotional: true,
      unsubscribeToken: 'test-preview-token',
      includeDiagnostics: true,
    });

    await EmailSendLogModel.create({
      id: `esl-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      sendType: 'test',
      recipientEmail: cleanTo,
      recipientName: input.sampleName || 'Admin Tester',
      subject: `[TEST] ${input.subject}`,
      status: result.sent ? 'delivered' : 'failed',
      attempts: 1,
      maxAttempts: 1,
      provider: result.provider,
      messageId: result.messageId,
      error: result.error,
      openCount: 0,
      clickCount: 0,
      sentAt: result.sent ? new Date().toISOString() : undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    return result;
  },

  async runDailyAutomationForDay(dayKey?: DayOfWeekKey, forceManual = false) {
    requireDatabaseConnection();
    const config = await this.ensureDailyAutomationConfig();
    const nowParts = getLocalDateParts(config.timezone);
    const activeDay = dayKey || nowParts.dayKey;
    const dayCfg = config.days[activeDay];
    if (!dayCfg || !dayCfg.enabled) {
      return { triggered: false, reason: `Template for ${activeDay} is disabled.` };
    }

    const dailyKey = `${nowParts.dateStr}:${activeDay}`;
    if (!forceManual && dayCfg.lastRunDate === nowParts.dateStr) {
      return { triggered: false, reason: `Already ran for ${dailyKey}.` };
    }

    const recipients = await this.resolveRecipients({
      targetType: 'categories',
      targetCategories: config.targetCategories,
    });

    if (recipients.length === 0) {
      await DailyAutomationConfigModel.updateOne(
        { key: 'daily_automation' },
        {
          $set: {
            [`days.${activeDay}.lastRunDate`]: nowParts.dateStr,
            updatedAt: new Date().toISOString(),
          },
        }
      );
      return { triggered: false, reason: 'No subscribed recipients matched daily target categories.' };
    }

    const now = new Date().toISOString();
    const ops = recipients.map((r) => ({
      updateOne: {
        filter: { dailyKey, recipientEmail: r.email },
        update: {
          $setOnInsert: {
            id: `esl-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
            dailyKey,
            sendType: 'daily_automation' as const,
            recipientEmail: r.email,
            recipientName: r.fullName,
            subject: dayCfg.subject,
            status: 'queued' as const,
            attempts: 0,
            maxAttempts: 3,
            openCount: 0,
            clickCount: 0,
            createdAt: now,
            updatedAt: now,
          },
        },
        upsert: true,
      },
    }));

    await EmailSendLogModel.bulkWrite(ops, { ordered: false }).catch(() => {});
    await DailyAutomationConfigModel.updateOne(
      { key: 'daily_automation' },
      {
        $set: {
          [`days.${activeDay}.lastRunDate`]: nowParts.dateStr,
          updatedAt: now,
        },
      }
    );

    await auditService.addLog(
      'Daily Automation Queued',
      `Queued "${dayCfg.title}" (${dailyKey}) for ${recipients.length} subscribed recipient(s)`,
      forceManual ? 'Admin' : 'Daily Scheduler'
    );

    setTimeout(() => {
      this.processPendingQueueTick().catch(console.error);
    }, 100);

    return { triggered: true, dailyKey, queuedCount: recipients.length };
  },

  async processPendingQueueTick(): Promise<void> {
    if (!isDatabaseConnected() || isQueueTickRunning) return;
    isQueueTickRunning = true;

    try {
      const nowIso = new Date().toISOString();
      const limits = await getRateLimits();

      // 1. Promote due scheduled campaigns
      const dueCampaigns = await EmailCampaignModel.find({
        status: 'scheduled',
        scheduledFor: { $lte: nowIso },
      }).lean();

      for (const camp of dueCampaigns) {
        const recipients = await this.resolveRecipients({
          targetType: camp.targetType,
          targetCategories: camp.targetCategories,
          targetProductIds: camp.targetProductIds,
          inactiveDays: camp.inactiveDays,
          neverPurchasedOnly: camp.neverPurchasedOnly,
          targetEmails: camp.targetEmails,
        });
        await this.enqueueCampaignLogs(camp.id, recipients, camp.subject);
        await EmailCampaignModel.updateOne(
          { id: camp.id },
          {
            $set: {
              status: recipients.length > 0 ? 'queued' : 'completed',
              totalRecipients: recipients.length,
              startedAt: nowIso,
              ...(recipients.length === 0 ? { completedAt: nowIso } : {}),
              updatedAt: nowIso,
            },
          }
        );
      }

      // 2. Check Mon-Sun daily automation window
      const dailyCfg = await this.ensureDailyAutomationConfig();
      if (dailyCfg.enabled) {
        const nowParts = getLocalDateParts(dailyCfg.timezone);
        const todayCfg = dailyCfg.days[nowParts.dayKey];
        if (
          todayCfg &&
          todayCfg.enabled &&
          todayCfg.lastRunDate !== nowParts.dateStr &&
          nowParts.timeStr >= (dailyCfg.sendTime || '09:00')
        ) {
          await this.runDailyAutomationForDay(nowParts.dayKey, false);
        }
      }

      // 3. Respect daily send quota before pulling batch
      const sentToday = await getTodayUtcSentCount();
      if (sentToday >= limits.dailySendLimit) {
        return;
      }
      const remainingDailyQuota = limits.dailySendLimit - sentToday;
      const batchTake = Math.min(limits.batchSize, remainingDailyQuota);

      // Find queued or retry-eligible logs whose campaign (if any) is NOT paused/cancelled
      const pausedCampaignIds = await EmailCampaignModel.distinct('id', {
        status: { $in: ['paused', 'cancelled'] },
      });

      const pendingLogs = await EmailSendLogModel.find({
        status: 'queued',
        ...(pausedCampaignIds.length > 0 ? { campaignId: { $nin: pausedCampaignIds } } : {}),
        $or: [{ nextRetryAt: { $exists: false } }, { nextRetryAt: null }, { nextRetryAt: { $lte: nowIso } }],
      })
        .sort({ createdAt: 1 })
        .limit(batchTake)
        .lean();

      if (pendingLogs.length === 0) return;

      const touchedCampaignIds = new Set<string>();
      const dailyConfigCache = dailyCfg;

      for (let i = 0; i < pendingLogs.length; i++) {
        const log = pendingLogs[i];
        const claimed = await EmailSendLogModel.findOneAndUpdate(
          { id: log.id, status: 'queued' },
          { $set: { status: 'sending', updatedAt: new Date().toISOString() }, $inc: { attempts: 1 } },
          { new: true }
        ).lean();
        if (!claimed) continue;

        const contact = await EmailContactModel.findOne({ email: claimed.recipientEmail }).lean();
        if (
          contact &&
          (contact.marketingConsent === 'unsubscribed' || contact.marketingConsent === 'suppressed')
        ) {
          await EmailSendLogModel.updateOne(
            { id: claimed.id },
            {
              $set: {
                status: 'failed',
                error: `Recipient is ${contact.marketingConsent} (excluded by compliance)`,
                updatedAt: new Date().toISOString(),
              },
            }
          );
          if (claimed.campaignId) touchedCampaignIds.add(claimed.campaignId);
          continue;
        }

        let sendResult;
        try {
          if (claimed.sendType === 'campaign' && claimed.campaignId) {
            const camp = await EmailCampaignModel.findOne({ id: claimed.campaignId }).lean();
            if (!camp || camp.status === 'paused' || camp.status === 'cancelled') {
              await EmailSendLogModel.updateOne(
                { id: claimed.id },
                { $set: { status: 'queued', updatedAt: new Date().toISOString() } }
              );
              continue;
            }
            if (camp.status === 'queued') {
              await EmailCampaignModel.updateOne(
                { id: camp.id },
                { $set: { status: 'sending', startedAt: camp.startedAt || new Date().toISOString() } }
              );
            }
            touchedCampaignIds.add(camp.id);

            sendResult = await emailService.sendBrandedEmail({
              to: claimed.recipientEmail,
              recipientName: contact?.fullName || claimed.recipientName,
              subject: camp.subject,
              bodyHtml: camp.htmlBody,
              imageUrl: camp.bannerImageUrl,
              ctaLabel: camp.ctaLabel,
              ctaUrl: camp.ctaUrl,
              preheader: camp.preheader,
              isPromotional: true,
              unsubscribeToken: contact?.unsubscribeToken,
              sendLogId: claimed.id,
            });
          } else if (claimed.sendType === 'daily_automation' && claimed.dailyKey) {
            const dayPart = claimed.dailyKey.split(':')[1] as DayOfWeekKey;
            const dayTpl = dailyConfigCache.days[dayPart];
            if (!dayTpl) {
              throw new Error(`Missing daily template for ${dayPart}`);
            }
            sendResult = await emailService.sendBrandedEmail({
              to: claimed.recipientEmail,
              recipientName: contact?.fullName || claimed.recipientName,
              subject: dayTpl.subject,
              greeting: dayTpl.greetingTemplate,
              bodyHtml: dayTpl.bodyHtml,
              imageUrl: dayTpl.imageUrl,
              ctaLabel: dayTpl.ctaLabel,
              ctaUrl: dayTpl.ctaUrl,
              isPromotional: true,
              unsubscribeToken: contact?.unsubscribeToken,
              sendLogId: claimed.id,
            });
          } else {
            continue;
          }

          const ts = new Date().toISOString();
          if (sendResult.sent) {
            await EmailSendLogModel.updateOne(
              { id: claimed.id },
              {
                $set: {
                  status: 'delivered',
                  provider: sendResult.provider,
                  messageId: sendResult.messageId,
                  sentAt: ts,
                  updatedAt: ts,
                },
              }
            );
          } else {
            const errMsg = sendResult.error || 'Provider rejected email';
            const bounced = isBounceErrorMessage(errMsg);
            if (bounced) {
              await emailContactService.recordBounce(claimed.recipientEmail, errMsg);
              await EmailSendLogModel.updateOne(
                { id: claimed.id },
                {
                  $set: {
                    status: 'bounced',
                    provider: sendResult.provider,
                    error: errMsg,
                    sentAt: ts,
                    updatedAt: ts,
                  },
                }
              );
            } else if ((claimed.attempts || 1) < (claimed.maxAttempts || 3)) {
              const retryAt = new Date(Date.now() + 60_000 * (claimed.attempts || 1)).toISOString();
              await EmailSendLogModel.updateOne(
                { id: claimed.id },
                {
                  $set: {
                    status: 'queued',
                    nextRetryAt: retryAt,
                    error: errMsg,
                    updatedAt: ts,
                  },
                }
              );
            } else {
              await EmailSendLogModel.updateOne(
                { id: claimed.id },
                {
                  $set: {
                    status: 'failed',
                    provider: sendResult.provider,
                    error: errMsg,
                    sentAt: ts,
                    updatedAt: ts,
                  },
                }
              );
            }
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          const canRetry = (claimed.attempts || 1) < (claimed.maxAttempts || 3);
          await EmailSendLogModel.updateOne(
            { id: claimed.id },
            {
              $set: {
                status: canRetry ? 'queued' : 'failed',
                ...(canRetry ? { nextRetryAt: new Date(Date.now() + 60_000).toISOString() } : {}),
                error: msg,
                updatedAt: new Date().toISOString(),
              },
            }
          );
        }

        if (i < pendingLogs.length - 1) {
          await new Promise((r) => setTimeout(r, Math.min(limits.batchDelayMs, 2500)));
        }
      }

      // Sync aggregate metrics back onto touched campaigns
      for (const campId of touchedCampaignIds) {
        await this.refreshCampaignStats(campId);
      }
    } finally {
      isQueueTickRunning = false;
    }
  },

  async refreshCampaignStats(campaignId: string): Promise<void> {
    const logs = await EmailSendLogModel.find({ campaignId }).lean();
    if (logs.length === 0) return;

    const deliveredCount = logs.filter((l) => l.status === 'delivered' || l.status === 'sent').length;
    const failedCount = logs.filter((l) => l.status === 'failed').length;
    const bouncedCount = logs.filter((l) => l.status === 'bounced').length;
    const queuedOrSending = logs.filter((l) => l.status === 'queued' || l.status === 'sending').length;
    const sentCount = deliveredCount + failedCount + bouncedCount;
    const openCount = logs.filter((l) => (l.openCount || 0) > 0).length;
    const clickCount = logs.filter((l) => (l.clickCount || 0) > 0).length;

    const camp = await EmailCampaignModel.findOne({ id: campaignId }).lean();
    if (!camp) return;

    const now = new Date().toISOString();
    const isFinished =
      queuedOrSending === 0 && camp.status !== 'paused' && camp.status !== 'cancelled';

    await EmailCampaignModel.updateOne(
      { id: campaignId },
      {
        $set: {
          sentCount,
          deliveredCount,
          failedCount,
          bouncedCount,
          openCount,
          clickCount,
          ...(isFinished ? { status: 'completed', completedAt: camp.completedAt || now } : {}),
          updatedAt: now,
        },
      }
    );
  },

  async recordEmailOpen(sendLogId: string): Promise<void> {
    if (!isDatabaseConnected()) return;
    const now = new Date().toISOString();
    const updated = await EmailSendLogModel.findOneAndUpdate(
      { id: sendLogId },
      {
        $inc: { openCount: 1 },
        $set: { updatedAt: now },
      },
      { new: true }
    ).lean();
    if (!updated) return;

    if (!updated.openedAt) {
      await EmailSendLogModel.updateOne({ id: sendLogId }, { $set: { openedAt: now } });
    }
    if (updated.campaignId) {
      await this.refreshCampaignStats(updated.campaignId);
    }
  },

  async recordEmailClick(sendLogId: string, rawTargetUrl: string): Promise<string> {
    const appBase = getPublicAppUrl();
    const fallbackUrl = appBase || '/';
    const cleanUrl = (rawTargetUrl || '').trim();

    if (!isDatabaseConnected() || !sendLogId || !isSafeHttpUrl(cleanUrl)) {
      return fallbackUrl;
    }

    const now = new Date().toISOString();
    const updated = await EmailSendLogModel.findOneAndUpdate(
      { id: sendLogId },
      {
        $inc: { clickCount: 1 },
        $set: { updatedAt: now },
      },
      { new: true }
    ).lean();

    // Only redirect if sendLogId corresponds to an authentic outbound email record
    if (!updated) {
      return fallbackUrl;
    }

    if (!updated.clickedAt) {
      await EmailSendLogModel.updateOne({ id: sendLogId }, { $set: { clickedAt: now } });
    }
    if (updated.campaignId) {
      await this.refreshCampaignStats(updated.campaignId);
    }

    try {
      const targetHost = new URL(cleanUrl).hostname.toLowerCase();
      const appHost = new URL(appBase).hostname.toLowerCase();
      const trustedSocialHosts = new Set([
        appHost,
        'wa.me',
        'api.whatsapp.com',
        'chat.whatsapp.com',
        't.me',
        'telegram.me',
        'facebook.com',
        'www.facebook.com',
        'instagram.com',
        'www.instagram.com',
        'youtube.com',
        'www.youtube.com',
        'x.com',
        'twitter.com',
      ]);

      if (trustedSocialHosts.has(targetHost)) {
        return cleanUrl;
      }

      if (updated.campaignId) {
        const campaign = await EmailCampaignModel.findOne({ id: updated.campaignId }).lean();
        if (
          campaign &&
          ((campaign.ctaUrl && campaign.ctaUrl.includes(cleanUrl)) ||
            (campaign.htmlBody && campaign.htmlBody.includes(cleanUrl)))
        ) {
          return cleanUrl;
        }
      }
    } catch {
      return fallbackUrl;
    }

    return fallbackUrl;
  },

  async getOverviewAndAnalytics(filters?: { from?: string; to?: string }) {
    requireDatabaseConnection();
    const categoryCounts = await emailContactService.getCategoryCounts();

    const campaignQuery: Record<string, unknown> = {};
    const logQuery: Record<string, unknown> = {};

    if (filters?.from || filters?.to) {
      const dateCond: Record<string, string> = {};
      if (filters.from) dateCond.$gte = new Date(filters.from).toISOString();
      if (filters.to) {
        const end = new Date(filters.to);
        end.setUTCHours(23, 59, 59, 999);
        dateCond.$lte = end.toISOString();
      }
      campaignQuery.createdAt = dateCond;
      logQuery.createdAt = dateCond;
    }

    const [campaigns, logs, dailyConfig, brevoEvents, providerStatus] = await Promise.all([
      EmailCampaignModel.find(campaignQuery).sort({ createdAt: -1 }).lean(),
      EmailSendLogModel.find(logQuery).sort({ createdAt: -1 }).limit(500).lean(),
      this.ensureDailyAutomationConfig(),
      emailService.fetchAccountEvents(30),
      emailService.getDetailedProviderDiagnostics(false),
    ]);

    const completedOrActive = campaigns.filter((c) => c.status !== 'draft');
    const deliveredTotal = logs.filter((l) => l.status === 'delivered' || l.status === 'sent').length;
    const failedTotal = logs.filter((l) => l.status === 'failed').length;
    const bouncedTotal = logs.filter((l) => l.status === 'bounced').length;
    const totalAttempts = deliveredTotal + failedTotal + bouncedTotal;
    const uniqueOpens = logs.filter((l) => (l.openCount || 0) > 0).length;
    const uniqueClicks = logs.filter((l) => (l.clickCount || 0) > 0).length;

    const openRate =
      deliveredTotal > 0 ? Math.round((uniqueOpens / deliveredTotal) * 1000) / 10 : 0;
    const clickThroughRate =
      deliveredTotal > 0 ? Math.round((uniqueClicks / deliveredTotal) * 1000) / 10 : 0;
    const unsubscribedCount = categoryCounts.Unsubscribed || 0;
    const unsubscribeRate =
      deliveredTotal > 0
        ? Math.round((unsubscribedCount / Math.max(deliveredTotal, categoryCounts['All Contacts'] || 1)) * 1000) / 10
        : 0;

    return {
      kpis: {
        totalContacts: categoryCounts['All Contacts'] || 0,
        affiliatesCount: categoryCounts.Affiliates || 0,
        newlyRegisteredAffiliatesCount: categoryCounts['Newly Registered Affiliates'] || 0,
        newCustomersCount: categoryCounts['New Customers'] || 0,
        existingCustomersCount: categoryCounts['Existing Customers'] || 0,
        repeatCustomersCount: categoryCounts['Repeat Customers'] || 0,
        newEmailsCount: categoryCounts['New Emails'] || 0,
        subscribedCount: categoryCounts.Subscribed || 0,
        pendingConsentCount: categoryCounts.PendingConsent || 0,
        unsubscribedCount,
        suppressedCount: categoryCounts.Suppressed || 0,
        campaignsSent: completedOrActive.filter((c) => c.status === 'completed').length,
        totalCampaigns: campaigns.length,
        totalEmailsSent: totalAttempts,
        deliveredCount: deliveredTotal,
        failedCount: failedTotal,
        bouncedCount: bouncedTotal,
        openCount: uniqueOpens,
        clickCount: uniqueClicks,
        openRate,
        clickThroughRate,
        unsubscribeRate,
      },
      providerStatus,
      categoryCounts,
      campaigns: campaigns.map(({ _id, ...rest }) => rest),
      recentLogs: logs.slice(0, 60).map(({ _id, ...rest }) => rest),
      dailyAutomationSummary: {
        enabled: dailyConfig.enabled,
        sendTime: dailyConfig.sendTime,
        timezone: dailyConfig.timezone,
        enabledDays: Object.values(dailyConfig.days).filter((d) => d.enabled).length,
      },
      brevoRecentEvents: brevoEvents.slice(0, 15),
      trackingNote:
        'Delivery/bounce counts come directly from Brevo API & send logs. Open rates rely on 1x1 tracking pixels (mail clients blocking remote images may undercount opens), and click rates are measured via tracked CTA/link redirects.',
    };
  },

  async exportAnalyticsCsv(filters?: { from?: string; to?: string }): Promise<string> {
    const data = await this.getOverviewAndAnalytics(filters);
    const esc = (v: unknown) => {
      const s = String(v ?? '');
      return s.includes(',') || s.includes('"') || s.includes('\n')
        ? `"${s.replace(/"/g, '""')}"`
        : s;
    };
    const headers = [
      'Campaign Name',
      'Subject',
      'Status',
      'Target Type',
      'Recipients',
      'Sent',
      'Delivered',
      'Failed',
      'Bounced',
      'Opens',
      'Clicks',
      'Scheduled For',
      'Completed At',
      'Created At',
    ];
    const rows = data.campaigns.map((c: EmailCampaign) =>
      [
        c.name,
        c.subject,
        c.status,
        c.targetType,
        c.totalRecipients,
        c.sentCount,
        c.deliveredCount,
        c.failedCount,
        c.bouncedCount,
        c.openCount,
        c.clickCount,
        c.scheduledFor || '',
        c.completedAt || '',
        c.createdAt,
      ]
        .map(esc)
        .join(',')
    );
    return [headers.join(','), ...rows].join('\n');
  },

  async getMarketingCalendar(month?: string) {
    requireDatabaseConnection();
    const [campaigns, dailyConfig] = await Promise.all([
      EmailCampaignModel.find().sort({ scheduledFor: 1, createdAt: -1 }).lean(),
      this.ensureDailyAutomationConfig(),
    ]);

    const targetMonth = month && /^\d{4}-\d{2}$/.test(month) ? month : new Date().toISOString().slice(0, 7);
    const [yrStr, moStr] = targetMonth.split('-');
    const year = Number(yrStr);
    const mon = Number(moStr);
    const daysInMonth = new Date(year, mon, 0).getDate();

    const events: Array<{
      id: string;
      date: string;
      time: string;
      title: string;
      subject: string;
      type: 'scheduled_campaign' | 'sent_campaign' | 'draft_campaign' | 'daily_automation';
      status: string;
      campaignId?: string;
      dayKey?: DayOfWeekKey;
      recipientsCount?: number;
    }> = [];

    for (const c of campaigns) {
      const ts = c.scheduledFor || c.completedAt || c.createdAt;
      const dateStr = ts.slice(0, 10);
      const timeStr = ts.slice(11, 16) || '09:00';
      events.push({
        id: `ev-${c.id}`,
        date: dateStr,
        time: timeStr,
        title: c.name,
        subject: c.subject,
        type:
          c.status === 'scheduled' || c.status === 'queued'
            ? 'scheduled_campaign'
            : c.status === 'draft'
            ? 'draft_campaign'
            : 'sent_campaign',
        status: c.status,
        campaignId: c.id,
        recipientsCount: c.totalRecipients,
      });
    }

    if (dailyConfig.enabled) {
      for (let d = 1; d <= daysInMonth; d++) {
        const dt = new Date(Date.UTC(year, mon - 1, d));
        const dayKey = DAY_KEYS[dt.getUTCDay()];
        const dayCfg = dailyConfig.days[dayKey];
        if (dayCfg?.enabled) {
          events.push({
            id: `daily-${targetMonth}-${d}`,
            date: dt.toISOString().slice(0, 10),
            time: dailyConfig.sendTime || '09:00',
            title: dayCfg.title,
            subject: dayCfg.subject,
            type: 'daily_automation',
            status: 'automated',
            dayKey,
          });
        }
      }
    }

    // Detect scheduling conflicts (same calendar date with >= 2 scheduled/automated sends within the same hour)
    const conflicts: Array<{ date: string; message: string }> = [];
    const byDateHour = new Map<string, typeof events>();
    for (const ev of events) {
      if (ev.type === 'scheduled_campaign' || ev.type === 'daily_automation') {
        const hour = (ev.time || '09:00').slice(0, 2);
        const key = `${ev.date}:${hour}`;
        const list = byDateHour.get(key) || [];
        list.push(ev);
        byDateHour.set(key, list);
      }
    }
    for (const [key, list] of byDateHour.entries()) {
      if (list.length > 1) {
        const [date, hour] = key.split(':');
        conflicts.push({
          date,
          message: `${list.length} sends overlap around ${hour}:00 on ${date}: ${list
            .map((e) => e.title)
            .join(', ')}`,
        });
      }
    }

    return {
      month: targetMonth,
      events,
      conflicts,
      dailyAutomation: dailyConfig,
    };
  },

  async previewThankYouEmail(input?: {
    customerName?: string;
    orderId?: string;
    brandingOverride?: Partial<EmailBrandingConfig>;
    whatsappCommunityUrl?: string;
    telegramChannelUrl?: string;
  }) {
    requireDatabaseConnection();
    return emailService.buildPurchaseThankYouEmail({
      orderId: input?.orderId || 'ZEEK-ORD-PREVIEW',
      customerName: input?.customerName || 'Valued Customer',
      customerEmail: 'customer@example.com',
      totalAmount: 15500,
      items: [{ productName: 'ChatGPT Plus (1 Month)', duration: '1 Month', quantity: 1 }],
      brandingOverride: input?.brandingOverride,
      communityOverride:
        input?.whatsappCommunityUrl !== undefined || input?.telegramChannelUrl !== undefined
          ? {
              whatsappCommunityUrl: input?.whatsappCommunityUrl,
              telegramChannelUrl: input?.telegramChannelUrl,
            }
          : undefined,
    });
  },

  async sendTestThankYouEmail(input: {
    to: string;
    brandingOverride?: Partial<EmailBrandingConfig>;
    whatsappCommunityUrl?: string;
    telegramChannelUrl?: string;
  }) {
    requireDatabaseConnection();
    const to = normalizeEmail(input.to);
    if (!isValidEmailFormat(to)) {
      throw new ApiError(400, 'Please enter a valid destination email address.');
    }

    const built = await emailService.buildPurchaseThankYouEmail({
      orderId: 'ZEEK-ORD-TEST',
      customerName: 'Admin Preview',
      customerEmail: to,
      totalAmount: 15500,
      items: [{ productName: 'ChatGPT Plus (1 Month)', duration: '1 Month', quantity: 1 }],
      brandingOverride: input.brandingOverride,
      communityOverride:
        input.whatsappCommunityUrl !== undefined || input.telegramChannelUrl !== undefined
          ? {
              whatsappCommunityUrl: input.whatsappCommunityUrl,
              telegramChannelUrl: input.telegramChannelUrl,
            }
          : undefined,
    });

    return emailService.sendEmail({
      to,
      subject: `[TEST] ${built.subject}`,
      text: built.text,
      html: built.html,
    });
  },

  async listThankYouHistory(limit = 60): Promise<EmailSendLog[]> {
    requireDatabaseConnection();
    const logs = await EmailSendLogModel.find({ sendType: 'thank_you' })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
    return logs.map(({ _id, ...rest }) => rest as EmailSendLog);
  },

  async retryThankYouEmail(logId: string) {
    requireDatabaseConnection();
    const log = await EmailSendLogModel.findOne({ id: logId, sendType: 'thank_you' }).lean();
    if (!log) throw new ApiError(404, 'Thank-you email log not found.');
    if (!log.orderId) throw new ApiError(400, 'No order reference attached to this delivery log.');

    const order = await OrderModel.findOne({ id: log.orderId }).lean();
    if (!order) throw new ApiError(404, 'Referenced order not found.');
    if (order.paymentStatus !== 'paid') {
      throw new ApiError(400, 'Cannot send thank-you email because this order is not marked as paid.');
    }

    return emailService.notifyCustomerPurchaseThankYou(order, {
      retryLogId: log.id,
      forceBypassSentFlag: true,
    });
  },

  startEmailScheduler(): void {
    if (schedulerTimer) return;
    schedulerTimer = setInterval(() => {
      this.processPendingQueueTick().catch((err) => {
        console.error('[EmailScheduler] Tick error:', err);
      });
    }, 20_000);
    // Run an initial check cleanly 5 seconds after server boot
    setTimeout(() => {
      this.processPendingQueueTick().catch(() => {});
    }, 5000);
    console.log('📅 Background Email Campaign & Mon–Sun Daily Scheduler started.');
  },

  stopEmailScheduler(): void {
    if (schedulerTimer) {
      clearInterval(schedulerTimer);
      schedulerTimer = null;
    }
  },
};
