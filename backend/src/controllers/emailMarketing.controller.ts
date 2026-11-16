import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/ApiError';
import { AuthenticatedAdminRequest } from '../middlewares/auth.middleware';
import { emailContactService, emailMarketingService, emailService } from '../services';
import { DayOfWeekKey } from '../types';

const ONE_BY_ONE_GIF = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64'
);

export const emailMarketingController = {
  // --- Public Preferences / Unsubscribe & Tracking ---
  getPreferencesByToken: asyncHandler(async (req: Request, res: Response) => {
    const contact = await emailContactService.getByUnsubscribeToken(req.params.token);
    if (!contact) {
      throw new ApiError(404, 'Email preference link is invalid or no longer exists.');
    }
    res.json({
      success: true,
      contact: {
        email: contact.email,
        fullName: contact.fullName,
        marketingConsent: contact.marketingConsent,
        unsubscribedAt: contact.unsubscribedAt,
        consentTimestamp: contact.consentTimestamp,
      },
    });
  }),

  updatePreferencesByToken: asyncHandler(async (req: Request, res: Response) => {
    const { action, reason } = req.body as {
      action: 'unsubscribe' | 'resubscribe';
      reason?: string;
    };
    if (action !== 'unsubscribe' && action !== 'resubscribe') {
      throw new ApiError(400, 'Action must be either "unsubscribe" or "resubscribe".');
    }
    const updated = await emailContactService.updatePreferencesByToken(req.params.token, {
      action,
      reason,
    });
    res.json({
      success: true,
      message:
        action === 'unsubscribe'
          ? 'You have been unsubscribed from promotional and daily emails.'
          : 'Your promotional email subscription has been restored.',
      contact: {
        email: updated.email,
        fullName: updated.fullName,
        marketingConsent: updated.marketingConsent,
        unsubscribedAt: updated.unsubscribedAt,
      },
    });
  }),

  trackOpenPixel: async (req: Request, res: Response) => {
    const sendLogId = req.params.sendLogId;
    if (sendLogId) {
      emailMarketingService.recordEmailOpen(sendLogId).catch(() => {});
    }
    res.setHeader('Content-Type', 'image/gif');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.status(200).send(ONE_BY_ONE_GIF);
  },

  trackClickRedirect: async (req: Request, res: Response) => {
    const sendLogId = req.params.sendLogId;
    const rawUrl = typeof req.query.url === 'string' ? req.query.url : '/';
    const target = await emailMarketingService.recordEmailClick(sendLogId, rawUrl);
    res.redirect(302, target);
  },

  // --- Admin Overview, Provider Status & Analytics ---
  getProviderStatus: asyncHandler(async (req: Request, res: Response) => {
    const verify = req.query.verify === 'true' || req.query.verify === '1';
    const providerStatus = await emailService.getDetailedProviderDiagnostics(verify);
    res.json({ success: true, providerStatus });
  }),

  getOverview: asyncHandler(async (req: Request, res: Response) => {
    const from = typeof req.query.from === 'string' ? req.query.from : undefined;
    const to = typeof req.query.to === 'string' ? req.query.to : undefined;
    const overview = await emailMarketingService.getOverviewAndAnalytics({ from, to });
    res.json({ success: true, ...overview });
  }),

  exportAnalyticsCsv: asyncHandler(async (req: Request, res: Response) => {
    const from = typeof req.query.from === 'string' ? req.query.from : undefined;
    const to = typeof req.query.to === 'string' ? req.query.to : undefined;
    const csv = await emailMarketingService.exportAnalyticsCsv({ from, to });
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="zeek-email-analytics.csv"');
    res.send(csv);
  }),

  // --- Admin Contact Management ---
  listContacts: asyncHandler(async (req: Request, res: Response) => {
    const category = typeof req.query.category === 'string' ? req.query.category : undefined;
    const search = typeof req.query.search === 'string' ? req.query.search : undefined;
    const consent = typeof req.query.consent === 'string' ? req.query.consent : undefined;
    const source = typeof req.query.source === 'string' ? req.query.source : undefined;
    const segment = typeof req.query.segment === 'string' ? req.query.segment : undefined;
    const productId = typeof req.query.productId === 'string' ? req.query.productId : undefined;
    const inactiveDays = req.query.inactiveDays ? Number(req.query.inactiveDays) : undefined;

    const [contacts, counts] = await Promise.all([
      emailContactService.listContacts({
        category,
        search,
        consent,
        source,
        segment,
        productId,
        inactiveDays,
      }),
      emailContactService.getCategoryCounts(),
    ]);

    res.json({ success: true, contacts, counts });
  }),

  syncContacts: asyncHandler(async (_req: Request, res: Response) => {
    const result = await emailContactService.syncAllExistingRecords();
    const counts = await emailContactService.getCategoryCounts();
    res.json({
      success: true,
      message: `Synchronized ${result.synced} existing platform records into centralized mailing lists.`,
      ...result,
      counts,
    });
  }),

  addManualContact: asyncHandler(async (req: Request, res: Response) => {
    const contact = await emailContactService.addManualContact(req.body);
    res.status(201).json({ success: true, contact });
  }),

  bulkImportContacts: asyncHandler(async (req: AuthenticatedAdminRequest, res: Response) => {
    const { rawText, source, categories, hasPermissionToEmail, fileName } = req.body;
    if (!rawText || typeof rawText !== 'string') {
      throw new ApiError(400, 'Please paste email addresses or upload a CSV file.');
    }
    const adminLabel = req.adminAuth?.email || req.adminAuth?.name || 'Admin';
    const result = await emailContactService.bulkImportContacts({
      rawText,
      source: source === 'csv_import' ? 'csv_import' : 'paste_import',
      categories,
      hasPermissionToEmail: Boolean(hasPermissionToEmail),
      importedBy: adminLabel,
      fileName,
    });
    res.json({ success: true, ...result });
  }),

  importMappedCsvContacts: asyncHandler(async (req: AuthenticatedAdminRequest, res: Response) => {
    const { contacts, fileName, duplicateMode, categories, hasPermissionToEmail } = req.body;
    if (!Array.isArray(contacts) || contacts.length === 0) {
      throw new ApiError(400, 'No contact rows provided for CSV import.');
    }
    const adminLabel = req.adminAuth?.email || req.adminAuth?.name || 'Admin';
    const result = await emailContactService.importMappedCsvContacts({
      contacts,
      fileName,
      duplicateMode,
      categories,
      hasPermissionToEmail: Boolean(hasPermissionToEmail),
      importedBy: adminLabel,
    });
    res.json({ success: true, ...result });
  }),

  getImportHistory: asyncHandler(async (_req: Request, res: Response) => {
    const history = await emailContactService.listImportHistory();
    res.json({ success: true, history });
  }),

  updateContact: asyncHandler(async (req: Request, res: Response) => {
    const contact = await emailContactService.updateContact(req.params.id, req.body);
    res.json({ success: true, contact });
  }),

  deleteContact: asyncHandler(async (req: Request, res: Response) => {
    const deleted = await emailContactService.deleteContact(req.params.id);
    if (!deleted) throw new ApiError(404, 'Contact not found');
    res.json({ success: true });
  }),

  exportContactsCsv: asyncHandler(async (req: Request, res: Response) => {
    const csv = await emailContactService.exportContactsCsv({
      category: typeof req.query.category === 'string' ? req.query.category : undefined,
      consent: typeof req.query.consent === 'string' ? req.query.consent : undefined,
      search: typeof req.query.search === 'string' ? req.query.search : undefined,
    });
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="zeek-email-contacts.csv"');
    res.send(csv);
  }),

  // --- Admin Campaigns ---
  listCampaigns: asyncHandler(async (_req: Request, res: Response) => {
    const campaigns = await emailMarketingService.listCampaigns();
    res.json({ success: true, campaigns });
  }),

  estimateAudience: asyncHandler(async (req: Request, res: Response) => {
    const estimate = await emailMarketingService.estimateAudience(req.body);
    res.json({ success: true, ...estimate });
  }),

  saveCampaign: asyncHandler(async (req: AuthenticatedAdminRequest, res: Response) => {
    const adminLabel = req.adminAuth?.email || req.adminAuth?.name || 'Admin';
    const campaign = await emailMarketingService.saveCampaign({
      ...req.body,
      createdBy: adminLabel,
    });
    res.status(201).json({ success: true, campaign });
  }),

  campaignAction: asyncHandler(async (req: Request, res: Response) => {
    const { action } = req.body as {
      action: 'pause' | 'resume' | 'cancel' | 'send_now' | 'delete';
    };
    const campaign = await emailMarketingService.updateCampaignAction(req.params.id, action);
    res.json({ success: true, campaign });
  }),

  previewEmail: asyncHandler(async (req: Request, res: Response) => {
    const preview = await emailMarketingService.previewEmail(req.body);
    res.json({ success: true, preview });
  }),

  sendTestEmail: asyncHandler(async (req: Request, res: Response) => {
    const result = await emailMarketingService.sendTestEmail(req.body);
    res.json({ success: true, result });
  }),

  // --- Admin Automated Daily Emails (Mon-Sun) ---
  getDailyAutomation: asyncHandler(async (_req: Request, res: Response) => {
    const config = await emailMarketingService.ensureDailyAutomationConfig();
    res.json({ success: true, config });
  }),

  updateDailyAutomation: asyncHandler(async (req: Request, res: Response) => {
    const config = await emailMarketingService.updateDailyAutomationConfig(req.body);
    res.json({ success: true, config });
  }),

  runDailyAutomationNow: asyncHandler(async (req: Request, res: Response) => {
    const dayKey = req.body?.dayKey as DayOfWeekKey | undefined;
    const result = await emailMarketingService.runDailyAutomationForDay(dayKey, true);
    res.json({ success: true, ...result });
  }),

  // --- Admin Marketing Calendar ---
  getCalendar: asyncHandler(async (req: Request, res: Response) => {
    const month = typeof req.query.month === 'string' ? req.query.month : undefined;
    const calendar = await emailMarketingService.getMarketingCalendar(month);
    res.json({ success: true, ...calendar });
  }),

  // --- Admin Purchase Thank-You Email Controls & History ---
  previewThankYouEmail: asyncHandler(async (req: Request, res: Response) => {
    const preview = await emailMarketingService.previewThankYouEmail(req.body);
    res.json({ success: true, preview });
  }),

  sendTestThankYouEmail: asyncHandler(async (req: Request, res: Response) => {
    const result = await emailMarketingService.sendTestThankYouEmail(req.body);
    res.json({ success: true, result });
  }),

  getThankYouHistory: asyncHandler(async (_req: Request, res: Response) => {
    const logs = await emailMarketingService.listThankYouHistory();
    res.json({ success: true, logs });
  }),

  retryThankYouEmail: asyncHandler(async (req: Request, res: Response) => {
    const result = await emailMarketingService.retryThankYouEmail(req.params.logId);
    res.json({ success: true, ...result });
  }),
};
