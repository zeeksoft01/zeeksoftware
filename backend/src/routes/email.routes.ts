import { Router } from 'express';
import { emailMarketingController } from '../controllers';
import { createRateLimiter, requireAdmin, validate } from '../middlewares';
import {
  addEmailContactSchema,
  bulkImportContactsSchema,
  campaignActionSchema,
  importMappedCsvSchema,
  previewBrandedEmailSchema,
  saveEmailCampaignSchema,
  sendTestBrandedEmailSchema,
  updateEmailContactSchema,
  updateEmailPreferencesSchema,
} from '../validations';

const router = Router();
const publicEmailLimiter = createRateLimiter(60_000, 60, 'email-pub');

// --- Public Preferences, Unsubscribe & Email Engagement Tracking ---
router.get(
  '/email/preferences/:token',
  publicEmailLimiter,
  emailMarketingController.getPreferencesByToken
);
router.post(
  '/email/preferences/:token',
  publicEmailLimiter,
  validate(updateEmailPreferencesSchema),
  emailMarketingController.updatePreferencesByToken
);
router.get(
  '/email/track/open/:sendLogId',
  publicEmailLimiter,
  emailMarketingController.trackOpenPixel
);
router.get(
  '/email/track/click/:sendLogId',
  publicEmailLimiter,
  emailMarketingController.trackClickRedirect
);

// --- Admin Email Marketing & CRM Routes (strictly requireAdmin) ---
router.use('/admin/email', requireAdmin);

router.get('/admin/email/provider-status', emailMarketingController.getProviderStatus);
router.get('/admin/email/overview', emailMarketingController.getOverview);
router.get('/admin/email/analytics/export', emailMarketingController.exportAnalyticsCsv);

router.get('/admin/email/contacts', emailMarketingController.listContacts);
router.post('/admin/email/contacts/sync', emailMarketingController.syncContacts);
router.post(
  '/admin/email/contacts',
  validate(addEmailContactSchema),
  emailMarketingController.addManualContact
);
router.post(
  '/admin/email/contacts/import',
  validate(bulkImportContactsSchema),
  emailMarketingController.bulkImportContacts
);
router.post(
  '/admin/email/contacts/import-csv',
  validate(importMappedCsvSchema),
  emailMarketingController.importMappedCsvContacts
);
router.get('/admin/email/imports', emailMarketingController.getImportHistory);
router.get('/admin/email/contacts/export', emailMarketingController.exportContactsCsv);
router.patch(
  '/admin/email/contacts/:id',
  validate(updateEmailContactSchema),
  emailMarketingController.updateContact
);
router.delete('/admin/email/contacts/:id', emailMarketingController.deleteContact);

router.get('/admin/email/campaigns', emailMarketingController.listCampaigns);
router.post('/admin/email/campaigns/estimate', emailMarketingController.estimateAudience);
router.post(
  '/admin/email/campaigns',
  validate(saveEmailCampaignSchema),
  emailMarketingController.saveCampaign
);
router.patch(
  '/admin/email/campaigns/:id',
  validate(campaignActionSchema),
  emailMarketingController.campaignAction
);

router.post(
  '/admin/email/preview',
  validate(previewBrandedEmailSchema),
  emailMarketingController.previewEmail
);
router.post(
  '/admin/email/test',
  validate(sendTestBrandedEmailSchema),
  emailMarketingController.sendTestEmail
);

router.post(
  '/admin/email/thank-you/preview',
  validate(previewBrandedEmailSchema),
  emailMarketingController.previewThankYouEmail
);
router.post(
  '/admin/email/thank-you/test',
  validate(sendTestBrandedEmailSchema),
  emailMarketingController.sendTestThankYouEmail
);
router.get('/admin/email/thank-you/history', emailMarketingController.getThankYouHistory);
router.post('/admin/email/thank-you/retry/:logId', emailMarketingController.retryThankYouEmail);

router.get('/admin/email/daily-automation', emailMarketingController.getDailyAutomation);
router.put('/admin/email/daily-automation', emailMarketingController.updateDailyAutomation);
router.post('/admin/email/daily-automation/run', emailMarketingController.runDailyAutomationNow);

router.get('/admin/email/calendar', emailMarketingController.getCalendar);

export default router;
