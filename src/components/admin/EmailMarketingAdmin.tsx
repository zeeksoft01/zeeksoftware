import React, { useEffect, useRef, useState } from 'react';
import {
  Mail,
  Users,
  Send,
  Calendar as CalendarIcon,
  BarChart3,
  Clock,
  CheckCircle,
  AlertCircle,
  Upload,
  Download,
  Search,
  Trash2,
  Edit,
  Plus,
  RefreshCw,
  Eye,
  Pause,
  Play,
  X,
  BellOff,
  Sparkles,
  FileSpreadsheet,
  Sliders,
  Loader2,
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
  Heart,
  History,
  RotateCcw,
} from 'lucide-react';
import {
  CampaignTargetType,
  DailyAutomationConfig,
  DailyEmailDayConfig,
  DayOfWeekKey,
  EmailBrandingConfig,
  EmailCampaign,
  EmailContact,
  EmailImportHistoryItem,
  EmailSendLog,
  MarketingConsentStatus,
  Product,
  SiteSettings,
} from '../../types';
import { api, EmailProviderDiagnostics } from '../../api/client';

type EmailSubSection =
  | 'overview'
  | 'all_contacts'
  | 'affiliates'
  | 'new_customers'
  | 'existing_customers'
  | 'repeat_customers'
  | 'new_emails'
  | 'manual_import'
  | 'campaigns'
  | 'scheduled'
  | 'daily_automation'
  | 'thank_you'
  | 'branding'
  | 'analytics'
  | 'calendar'
  | 'unsubscribed';

interface EmailMarketingAdminProps {
  token: string;
  settings: SiteSettings;
  setSettings: React.Dispatch<React.SetStateAction<SiteSettings | null>>;
  products: Product[];
  uploadAssetFile: (file: File) => Promise<string>;
  onRefreshPublicData: () => void;
  setSaveSuccessMsg: (msg: string) => void;
  setSaveErrorMsg: (msg: string) => void;
}

const CONTACT_CATEGORIES = [
  'Affiliates',
  'New Customers',
  'Existing Customers',
  'Repeat Customers',
  'New Emails',
];

const DAYS_OF_WEEK: Array<{ key: DayOfWeekKey; label: string }> = [
  { key: 'monday', label: 'Monday' },
  { key: 'tuesday', label: 'Tuesday' },
  { key: 'wednesday', label: 'Wednesday' },
  { key: 'thursday', label: 'Thursday' },
  { key: 'friday', label: 'Friday' },
  { key: 'saturday', label: 'Saturday' },
  { key: 'sunday', label: 'Sunday' },
];

function parseCsvMatrix(raw: string): string[][] {
  const text = raw.replace(/^\uFEFF/, '');
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cell += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        row.push(cell.trim());
        cell = '';
      } else if (ch === '\r' && text[i + 1] === '\n') {
        row.push(cell.trim());
        if (row.some((c) => c !== '')) rows.push(row);
        row = [];
        cell = '';
        i++;
      } else if (ch === '\n' || ch === '\r') {
        row.push(cell.trim());
        if (row.some((c) => c !== '')) rows.push(row);
        row = [];
        cell = '';
      } else {
        cell += ch;
      }
    }
  }
  if (cell.length > 0 || row.length > 0) {
    row.push(cell.trim());
    if (row.some((c) => c !== '')) rows.push(row);
  }
  return rows;
}

export const EmailMarketingAdmin: React.FC<EmailMarketingAdminProps> = ({
  token,
  settings,
  setSettings,
  products,
  uploadAssetFile,
  onRefreshPublicData,
  setSaveSuccessMsg,
  setSaveErrorMsg,
}) => {
  const [subSection, setSubSection] = useState<EmailSubSection>('overview');
  const [loading, setLoading] = useState(false);

  // Overview & Analytics state
  const [overview, setOverview] = useState<Awaited<ReturnType<typeof api.getEmailOverview>> | null>(null);
  const [providerStatus, setProviderStatus] = useState<EmailProviderDiagnostics | null>(null);
  const [verifyingProvider, setVerifyingProvider] = useState(false);
  const [diagnosticTestEmail, setDiagnosticTestEmail] = useState('');
  const [sendingDiagnosticTest, setSendingDiagnosticTest] = useState(false);
  const [analyticsFrom, setAnalyticsFrom] = useState('');
  const [analyticsTo, setAnalyticsTo] = useState('');

  // Contacts state
  const [contacts, setContacts] = useState<EmailContact[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [contactSearch, setContactSearch] = useState('');
  const [contactConsentFilter, setContactConsentFilter] = useState('all');
  const [contactSourceFilter, setContactSourceFilter] = useState('all');
  const [editingContact, setEditingContact] = useState<EmailContact | null>(null);
  const [deletingContactId, setDeletingContactId] = useState<string | null>(null);

  // Manual Import state
  const [singleEmail, setSingleEmail] = useState('');
  const [singleName, setSingleName] = useState('');
  const [singleWhatsApp, setSingleWhatsApp] = useState('');
  const [singleNotes, setSingleNotes] = useState('');
  const [singleConsent, setSingleConsent] = useState<MarketingConsentStatus>('pending');
  const [singleCategories, setSingleCategories] = useState<string[]>(['New Emails']);

  const [bulkText, setBulkText] = useState('');
  const [bulkSource, setBulkSource] = useState<'paste_import' | 'csv_import'>('paste_import');
  const [bulkCategories, setBulkCategories] = useState<string[]>(['New Emails']);
  const [bulkPermission, setBulkPermission] = useState(false);
  const [importReport, setImportReport] = useState<{
    totalParsed: number;
    imported: number;
    updated: number;
    skippedExisting?: number;
    duplicatesSkipped: number;
    suppressedProtected?: number;
    invalidEmails: string[];
  } | null>(null);
  const csvInputRef = useRef<HTMLInputElement | null>(null);
  const mappedCsvInputRef = useRef<HTMLInputElement | null>(null);

  // Interactive CSV Mapper & Import History state
  const [csvFileName, setCsvFileName] = useState('');
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<string[][]>([]);
  const [csvHasHeaderRow, setCsvHasHeaderRow] = useState(true);
  const [csvMapping, setCsvMapping] = useState<{
    email: string;
    firstName: string;
    lastName: string;
    fullName: string;
    whatsApp: string;
    notes: string;
  }>({
    email: '',
    firstName: '',
    lastName: '',
    fullName: '',
    whatsApp: '',
    notes: '',
  });
  const [csvDuplicateMode, setCsvDuplicateMode] = useState<'skip' | 'update'>('skip');
  const [csvCategories, setCsvCategories] = useState<string[]>(['New Emails']);
  const [csvPermission, setCsvPermission] = useState(false);
  const [importHistory, setImportHistory] = useState<EmailImportHistoryItem[]>([]);

  // Campaigns state
  const [campaigns, setCampaigns] = useState<EmailCampaign[]>([]);
  const [campaignForm, setCampaignForm] = useState<{
    id?: string;
    name: string;
    subject: string;
    preheader: string;
    htmlBody: string;
    bannerImageUrl: string;
    ctaLabel: string;
    ctaUrl: string;
    targetType: CampaignTargetType;
    targetCategories: string[];
    targetProductIds: string[];
    inactiveDays: number;
    neverPurchasedOnly: boolean;
    targetEmailsText: string;
    scheduledFor: string;
  }>({
    name: '',
    subject: '',
    preheader: '',
    htmlBody:
      '<p>Hi {{firstName}},</p><p>We have exciting productivity updates and subsidized software offers waiting for you at Zeek Softwares.</p>',
    bannerImageUrl: '',
    ctaLabel: 'Browse Software Plans',
    ctaUrl: typeof window !== 'undefined' ? `${window.location.origin}/products` : 'https://zeeksoftwares.com/products',
    targetType: 'all',
    targetCategories: [],
    targetProductIds: [],
    inactiveDays: 30,
    neverPurchasedOnly: false,
    targetEmailsText: '',
    scheduledFor: '',
  });
  const [audienceEstimate, setAudienceEstimate] = useState<{
    eligibleCount: number;
    pendingExcludedCount: number;
    sampleRecipients: Array<{ email: string; fullName: string }>;
  } | null>(null);
  const [testEmailAddress, setTestEmailAddress] = useState('');
  const [previewModal, setPreviewModal] = useState<{ subject: string; html: string } | null>(null);
  const [uploadingBanner, setUploadingBanner] = useState(false);

  // Daily Automation state
  const [dailyConfig, setDailyConfig] = useState<DailyAutomationConfig | null>(null);
  const [activeDay, setActiveDay] = useState<DayOfWeekKey>('monday');
  const [dailyTestEmail, setDailyTestEmail] = useState('');

  // Thank-You Email History & Community Links state
  const [thankYouHistory, setThankYouHistory] = useState<EmailSendLog[]>([]);
  const [thankYouTestEmail, setThankYouTestEmail] = useState('');
  const [retryingLogId, setRetryingLogId] = useState<string | null>(null);
  const [whatsappCommunityInput, setWhatsappCommunityInput] = useState(
    settings.whatsappCommunityUrl || ''
  );
  const [telegramChannelInput, setTelegramChannelInput] = useState(
    settings.telegramChannelUrl || ''
  );

  // Branding state
  const [brandingForm, setBrandingForm] = useState<EmailBrandingConfig>({
    websiteUrl: settings.emailBranding?.websiteUrl || 'https://zeeksoftwares.com',
    footerNote: settings.emailBranding?.footerNote || 'Thank you for trusting Zeek Softwares for verified digital productivity tools.',
    facebookUrl: settings.emailBranding?.facebookUrl || '',
    instagramUrl: settings.emailBranding?.instagramUrl || '',
    twitterUrl: settings.emailBranding?.twitterUrl || '',
    youtubeUrl: settings.emailBranding?.youtubeUrl || '',
    orderConfirmationSubject:
      settings.emailBranding?.orderConfirmationSubject || 'Order Confirmed ({{orderId}}) — Zeek Softwares',
    orderConfirmationIntro:
      settings.emailBranding?.orderConfirmationIntro ||
      'Hi {{customerName}}, your payment for order {{orderId}} has been verified. Use your access option below.',
    batchSize: settings.emailBranding?.batchSize ?? 25,
    batchDelayMs: settings.emailBranding?.batchDelayMs ?? 1200,
    dailySendLimit: settings.emailBranding?.dailySendLimit ?? 280,
    thankYouEnabled: settings.emailBranding?.thankYouEnabled ?? true,
    thankYouSubject:
      settings.emailBranding?.thankYouSubject ||
      'Thank You for Your Purchase ({{orderId}}) — Welcome to {{storeName}}!',
    thankYouGreeting:
      settings.emailBranding?.thankYouGreeting || 'Thank You, {{firstName}}!',
    thankYouBodyHtml:
      settings.emailBranding?.thankYouBodyHtml ||
      '<p>We sincerely appreciate your recent purchase of <strong>{{itemsSummary}}</strong> (Order <strong>{{orderId}}</strong>).</p><p>Stay connected with our official communities below for activation tips, software updates, and member support:</p>',
    thankYouWhatsappBtnLabel:
      settings.emailBranding?.thankYouWhatsappBtnLabel || 'JOIN OUR WHATSAPP COMMUNITY',
    thankYouTelegramBtnLabel:
      settings.emailBranding?.thankYouTelegramBtnLabel || 'JOIN OUR TELEGRAM COMMUNITY',
  });

  useEffect(() => {
    setWhatsappCommunityInput(settings.whatsappCommunityUrl || '');
    setTelegramChannelInput(settings.telegramChannelUrl || '');
    if (settings.emailBranding) {
      setBrandingForm((prev) => ({
        ...prev,
        ...settings.emailBranding,
      }));
    }
  }, [settings]);

  // Calendar state
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [calendarData, setCalendarData] = useState<Awaited<ReturnType<typeof api.getMarketingCalendar>> | null>(null);

  const loadOverview = async (from?: string, to?: string) => {
    setLoading(true);
    try {
      const res = await api.getEmailOverview(token, {
        from: from ?? (analyticsFrom || undefined),
        to: to ?? (analyticsTo || undefined),
      });
      setOverview(res);
      if (res.providerStatus) setProviderStatus(res.providerStatus);
      setCounts(res.categoryCounts || {});
      setCampaigns(res.campaigns || []);
    } catch (err: unknown) {
      setSaveErrorMsg(err instanceof Error ? err.message : 'Failed to load email analytics.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyEmailProvider = async () => {
    setVerifyingProvider(true);
    setSaveErrorMsg('');
    try {
      const status = await api.getEmailProviderStatus(token, true);
      setProviderStatus(status);
      if (status.liveCheck?.brevoApiOk || status.liveCheck?.smtpOk) {
        setSaveSuccessMsg(`Email transport verified: ${status.providerLabel}`);
      } else if (!status.configured) {
        setSaveErrorMsg('No BREVO_API_KEY or SMTP credentials detected in environment secrets.');
      } else {
        setSaveErrorMsg(
          status.liveCheck?.brevoError ||
            status.liveCheck?.smtpError ||
            'Live provider verification reported an error.'
        );
      }
    } catch (err: unknown) {
      setSaveErrorMsg(err instanceof Error ? err.message : 'Failed to verify SMTP / Brevo connection.');
    } finally {
      setVerifyingProvider(false);
    }
  };

  const handleSendDiagnosticTestEmail = async () => {
    if (!diagnosticTestEmail.trim()) {
      setSaveErrorMsg('Enter an email address to run the diagnostic send test.');
      return;
    }
    setSendingDiagnosticTest(true);
    setSaveErrorMsg('');
    try {
      const res = await api.sendTestBrandedEmail(token, {
        to: diagnosticTestEmail.trim(),
        subject: 'Zeek Softwares — SMTP / Brevo Delivery Diagnostic',
        bodyHtml:
          '<p>This diagnostic test confirms your active Brevo API / SMTP configuration is delivering emails cleanly.</p>',
        sampleName: 'Administrator',
      });
      if (res?.sent) {
        setSaveSuccessMsg(`Diagnostic email dispatched to ${diagnosticTestEmail.trim()} via ${res.provider}.`);
      } else {
        setSaveErrorMsg(res?.error || 'Email transport is not configured or failed to deliver.');
      }
    } catch (err: unknown) {
      setSaveErrorMsg(err instanceof Error ? err.message : 'Diagnostic test email failed.');
    } finally {
      setSendingDiagnosticTest(false);
    }
  };

  const loadContactsForSection = async (sec: EmailSubSection) => {
    setLoading(true);
    try {
      let categoryParam: string | undefined;
      let consentParam: string | undefined = contactConsentFilter !== 'all' ? contactConsentFilter : undefined;

      if (sec === 'affiliates') categoryParam = 'Affiliates';
      else if (sec === 'new_customers') categoryParam = 'New Customers';
      else if (sec === 'existing_customers') categoryParam = 'Existing Customers';
      else if (sec === 'repeat_customers') categoryParam = 'Repeat Customers';
      else if (sec === 'new_emails') categoryParam = 'New Emails';
      else if (sec === 'unsubscribed') consentParam = 'unsubscribed_or_suppressed';

      const res = await api.getEmailContacts(token, {
        category: categoryParam,
        search: contactSearch.trim() || undefined,
        consent: consentParam,
        source: contactSourceFilter !== 'all' ? contactSourceFilter : undefined,
      });
      setContacts(res.contacts);
      setCounts(res.counts);
    } catch (err: unknown) {
      setSaveErrorMsg(err instanceof Error ? err.message : 'Failed to load contacts.');
    } finally {
      setLoading(false);
    }
  };

  const loadCampaigns = async () => {
    setLoading(true);
    try {
      const list = await api.getEmailCampaigns(token);
      setCampaigns(list);
    } catch (err: unknown) {
      setSaveErrorMsg(err instanceof Error ? err.message : 'Failed to load campaigns.');
    } finally {
      setLoading(false);
    }
  };

  const loadDailyAutomation = async () => {
    setLoading(true);
    try {
      const cfg = await api.getDailyEmailAutomation(token);
      setDailyConfig(cfg);
    } catch (err: unknown) {
      setSaveErrorMsg(err instanceof Error ? err.message : 'Failed to load daily automation.');
    } finally {
      setLoading(false);
    }
  };

  const loadCalendar = async (monthStr = calendarMonth) => {
    setLoading(true);
    try {
      const res = await api.getMarketingCalendar(token, monthStr);
      setCalendarData(res);
    } catch (err: unknown) {
      setSaveErrorMsg(err instanceof Error ? err.message : 'Failed to load marketing calendar.');
    } finally {
      setLoading(false);
    }
  };

  const loadImportHistory = async () => {
    try {
      const history = await api.getEmailImportHistory(token);
      setImportHistory(history);
    } catch {
      // Non-fatal UI load
    }
  };

  const loadThankYouHistory = async () => {
    setLoading(true);
    try {
      const logs = await api.getThankYouHistory(token);
      setThankYouHistory(logs);
    } catch (err: unknown) {
      setSaveErrorMsg(err instanceof Error ? err.message : 'Failed to load thank-you history.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (subSection === 'overview' || subSection === 'analytics') {
      loadOverview();
    } else if (
      [
        'all_contacts',
        'affiliates',
        'new_customers',
        'existing_customers',
        'repeat_customers',
        'new_emails',
        'unsubscribed',
      ].includes(subSection)
    ) {
      loadContactsForSection(subSection);
    } else if (subSection === 'manual_import') {
      loadImportHistory();
    } else if (subSection === 'campaigns' || subSection === 'scheduled') {
      loadCampaigns();
    } else if (subSection === 'daily_automation') {
      loadDailyAutomation();
    } else if (subSection === 'thank_you') {
      loadThankYouHistory();
    } else if (subSection === 'calendar') {
      loadCalendar(calendarMonth);
    }
  }, [subSection]);

  const handleSyncDatabase = async () => {
    setLoading(true);
    setSaveErrorMsg('');
    try {
      const res = await api.syncEmailContacts(token);
      setSaveSuccessMsg(res.message);
      setCounts(res.counts);
      await loadOverview();
    } catch (err: unknown) {
      setSaveErrorMsg(err instanceof Error ? err.message : 'Sync failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveEditedContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingContact) return;
    try {
      await api.updateEmailContact(token, editingContact.id, {
        fullName: editingContact.fullName,
        whatsApp: editingContact.whatsApp,
        categories: editingContact.categories,
        marketingConsent: editingContact.marketingConsent,
        notes: editingContact.notes,
      });
      setSaveSuccessMsg(`Contact ${editingContact.email} updated.`);
      setEditingContact(null);
      await loadContactsForSection(subSection);
    } catch (err: unknown) {
      setSaveErrorMsg(err instanceof Error ? err.message : 'Failed to update contact.');
    }
  };

  const handleDeleteContact = async (id: string) => {
    try {
      await api.deleteEmailContact(token, id);
      setDeletingContactId(null);
      setSaveSuccessMsg('Contact permanently removed.');
      await loadContactsForSection(subSection);
    } catch (err: unknown) {
      setSaveErrorMsg(err instanceof Error ? err.message : 'Failed to delete contact.');
    }
  };

  const handleAddSingleContact = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveErrorMsg('');
    try {
      await api.addManualEmailContact(token, {
        email: singleEmail.trim(),
        fullName: singleName.trim() || undefined,
        whatsApp: singleWhatsApp.trim() || undefined,
        categories: singleCategories.length ? singleCategories : ['New Emails'],
        marketingConsent: singleConsent,
        notes: singleNotes.trim() || undefined,
      });
      setSaveSuccessMsg(`Added ${singleEmail.trim()} to mailing list.`);
      setSingleEmail('');
      setSingleName('');
      setSingleWhatsApp('');
      setSingleNotes('');
    } catch (err: unknown) {
      setSaveErrorMsg(err instanceof Error ? err.message : 'Failed to add contact.');
    }
  };

  const handleBulkImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkText.trim()) return;
    setLoading(true);
    setSaveErrorMsg('');
    setImportReport(null);
    try {
      const report = await api.bulkImportEmailContacts(token, {
        rawText: bulkText,
        source: bulkSource,
        categories: bulkCategories.length ? bulkCategories : ['New Emails'],
        hasPermissionToEmail: bulkPermission,
      });
      setImportReport(report);
      setSaveSuccessMsg(
        `Processed ${report.totalParsed} lines: ${report.imported} added, ${report.updated} updated, ${report.duplicatesSkipped} duplicates skipped.`
      );
      setBulkText('');
      await loadImportHistory();
    } catch (err: unknown) {
      setSaveErrorMsg(err instanceof Error ? err.message : 'Bulk import failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleCsvFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setBulkText(String(reader.result || ''));
      setBulkSource('csv_import');
    };
    reader.readAsText(file);
  };

  const autoDetectCsvMapping = (headers: string[]) => {
    const findIdx = (patterns: RegExp[]) => {
      const idx = headers.findIndex((h) => patterns.some((rx) => rx.test(h.trim().toLowerCase())));
      return idx >= 0 ? String(idx) : '';
    };
    return {
      email: findIdx([/^e?-?mail/, /email\s*address/]),
      firstName: findIdx([/^first\s*_?\s*name$/, /^fname$/, /^given\s*name$/]),
      lastName: findIdx([/^last\s*_?\s*name$/, /^lname$/, /^surname$/, /^family\s*name$/]),
      fullName: findIdx([/^full\s*_?\s*name$/, /^name$/, /^contact\s*name$/, /^customer$/]),
      whatsApp: findIdx([/whatsapp/, /phone/, /mobile/, /^tel$/]),
      notes: findIdx([/note/, /comment/, /tag/, /remark/]),
    };
  };

  const handleMappedCsvFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSaveErrorMsg('');
    setImportReport(null);
    const reader = new FileReader();
    reader.onload = () => {
      const matrix = parseCsvMatrix(String(reader.result || ''));
      if (matrix.length === 0) {
        setSaveErrorMsg('The uploaded CSV file appears empty.');
        return;
      }
      setCsvFileName(file.name);
      const firstRowLooksLikeHeader = matrix[0].some((cell) => !/@/.test(cell));
      setCsvHasHeaderRow(firstRowLooksLikeHeader);
      const detectedHeaders = firstRowLooksLikeHeader
        ? matrix[0].map((h, idx) => h || `Column ${idx + 1}`)
        : matrix[0].map((_, idx) => `Column ${idx + 1}`);
      const bodyRows = firstRowLooksLikeHeader ? matrix.slice(1) : matrix;
      setCsvHeaders(detectedHeaders);
      setCsvRows(bodyRows);
      setCsvMapping(autoDetectCsvMapping(detectedHeaders));
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleSubmitMappedCsvImport = async () => {
    if (csvRows.length === 0) {
      setSaveErrorMsg('Upload a CSV file before importing.');
      return;
    }
    if (csvMapping.email === '') {
      setSaveErrorMsg('Please map which CSV column contains the Email Address.');
      return;
    }
    const emailIdx = Number(csvMapping.email);
    const firstNameIdx = csvMapping.firstName !== '' ? Number(csvMapping.firstName) : -1;
    const lastNameIdx = csvMapping.lastName !== '' ? Number(csvMapping.lastName) : -1;
    const fullNameIdx = csvMapping.fullName !== '' ? Number(csvMapping.fullName) : -1;
    const whatsAppIdx = csvMapping.whatsApp !== '' ? Number(csvMapping.whatsApp) : -1;
    const notesIdx = csvMapping.notes !== '' ? Number(csvMapping.notes) : -1;

    const mappedContacts = csvRows.map((row) => ({
      email: (row[emailIdx] || '').trim(),
      firstName: firstNameIdx >= 0 ? (row[firstNameIdx] || '').trim() : undefined,
      lastName: lastNameIdx >= 0 ? (row[lastNameIdx] || '').trim() : undefined,
      fullName: fullNameIdx >= 0 ? (row[fullNameIdx] || '').trim() : undefined,
      whatsApp: whatsAppIdx >= 0 ? (row[whatsAppIdx] || '').trim() : undefined,
      notes: notesIdx >= 0 ? (row[notesIdx] || '').trim() : undefined,
    }));

    setLoading(true);
    setSaveErrorMsg('');
    setImportReport(null);
    try {
      const report = await api.importMappedCsvContacts(token, {
        contacts: mappedContacts,
        fileName: csvFileName || 'contacts.csv',
        duplicateMode: csvDuplicateMode,
        categories: csvCategories.length ? csvCategories : ['New Emails'],
        hasPermissionToEmail: csvPermission,
      });
      setImportReport(report);
      setSaveSuccessMsg(
        `CSV import complete (${csvFileName}): ${report.imported} added, ${report.updated} updated, ${report.skippedExisting} skipped, ${report.suppressedProtected} opt-out/suppressed protected.`
      );
      await loadImportHistory();
    } catch (err: unknown) {
      setSaveErrorMsg(err instanceof Error ? err.message : 'Mapped CSV import failed.');
    } finally {
      setLoading(false);
    }
  };

  const getCampaignTargetPayload = () => ({
    targetType: campaignForm.targetType,
    targetCategories: campaignForm.targetCategories,
    targetProductIds: campaignForm.targetProductIds,
    inactiveDays: campaignForm.inactiveDays,
    neverPurchasedOnly: campaignForm.neverPurchasedOnly,
    targetEmails: campaignForm.targetEmailsText
      .split(/[\s,;]+/)
      .map((s) => s.trim())
      .filter(Boolean),
  });

  const handleEstimateAudience = async () => {
    setSaveErrorMsg('');
    try {
      const res = await api.estimateCampaignAudience(token, getCampaignTargetPayload());
      setAudienceEstimate(res);
    } catch (err: unknown) {
      setSaveErrorMsg(err instanceof Error ? err.message : 'Audience estimate failed.');
    }
  };

  const handleSaveCampaign = async (action: 'save_draft' | 'schedule' | 'send_now') => {
    if (!campaignForm.name.trim() || !campaignForm.subject.trim() || !campaignForm.htmlBody.trim()) {
      setSaveErrorMsg('Campaign name, subject, and body content are required.');
      return;
    }
    if (action === 'schedule' && !campaignForm.scheduledFor) {
      setSaveErrorMsg('Please choose a future date and time for scheduling.');
      return;
    }
    setLoading(true);
    setSaveErrorMsg('');
    try {
      await api.saveEmailCampaign(token, {
        id: campaignForm.id,
        name: campaignForm.name.trim(),
        subject: campaignForm.subject.trim(),
        preheader: campaignForm.preheader.trim() || undefined,
        htmlBody: campaignForm.htmlBody,
        bannerImageUrl: campaignForm.bannerImageUrl.trim() || undefined,
        ctaLabel: campaignForm.ctaLabel.trim() || undefined,
        ctaUrl: campaignForm.ctaUrl.trim() || undefined,
        ...getCampaignTargetPayload(),
        scheduledFor: campaignForm.scheduledFor ? new Date(campaignForm.scheduledFor).toISOString() : undefined,
        action,
      });
      setSaveSuccessMsg(
        action === 'send_now'
          ? 'Campaign queued for delivery via Brevo!'
          : action === 'schedule'
          ? 'Campaign scheduled successfully.'
          : 'Campaign saved as draft.'
      );
      await loadCampaigns();
    } catch (err: unknown) {
      setSaveErrorMsg(err instanceof Error ? err.message : 'Failed to save campaign.');
    } finally {
      setLoading(false);
    }
  };

  const handleCampaignAction = async (
    id: string,
    action: 'pause' | 'resume' | 'cancel' | 'send_now' | 'delete'
  ) => {
    setSaveErrorMsg('');
    try {
      await api.emailCampaignAction(token, id, action);
      setSaveSuccessMsg(`Campaign action "${action.replace('_', ' ')}" applied.`);
      await loadCampaigns();
    } catch (err: unknown) {
      setSaveErrorMsg(err instanceof Error ? err.message : 'Action failed.');
    }
  };

  const handlePreviewCampaign = async () => {
    try {
      const preview = await api.previewBrandedEmail(token, {
        subject: campaignForm.subject || 'Sample Subject',
        bodyHtml: campaignForm.htmlBody,
        imageUrl: campaignForm.bannerImageUrl || undefined,
        ctaLabel: campaignForm.ctaLabel || undefined,
        ctaUrl: campaignForm.ctaUrl || undefined,
        preheader: campaignForm.preheader || undefined,
        sampleName: 'Valued Customer',
      });
      setPreviewModal(preview);
    } catch (err: unknown) {
      setSaveErrorMsg(err instanceof Error ? err.message : 'Failed to render preview.');
    }
  };

  const handleSendTestCampaign = async () => {
    if (!testEmailAddress.trim()) {
      setSaveErrorMsg('Enter an email address to receive the test email.');
      return;
    }
    setLoading(true);
    try {
      await api.sendTestBrandedEmail(token, {
        to: testEmailAddress.trim(),
        subject: campaignForm.subject || 'Test Campaign',
        bodyHtml: campaignForm.htmlBody,
        imageUrl: campaignForm.bannerImageUrl || undefined,
        ctaLabel: campaignForm.ctaLabel || undefined,
        ctaUrl: campaignForm.ctaUrl || undefined,
        preheader: campaignForm.preheader || undefined,
        sampleName: 'Admin Tester',
      });
      setSaveSuccessMsg(`Test email sent to ${testEmailAddress.trim()} via Brevo.`);
    } catch (err: unknown) {
      setSaveErrorMsg(err instanceof Error ? err.message : 'Test send failed.');
    } finally {
      setLoading(false);
    }
  };

  const updateDayTemplate = (day: DayOfWeekKey, patch: Partial<DailyEmailDayConfig>) => {
    if (!dailyConfig) return;
    setDailyConfig({
      ...dailyConfig,
      days: {
        ...dailyConfig.days,
        [day]: {
          ...dailyConfig.days[day],
          ...patch,
        },
      },
    });
  };

  const handleSaveDailyConfig = async () => {
    if (!dailyConfig) return;
    setLoading(true);
    setSaveErrorMsg('');
    try {
      const updated = await api.updateDailyEmailAutomation(token, dailyConfig);
      setDailyConfig(updated);
      setSaveSuccessMsg('Mon–Sun Automated Daily Emails configuration saved.');
    } catch (err: unknown) {
      setSaveErrorMsg(err instanceof Error ? err.message : 'Failed to save automation config.');
    } finally {
      setLoading(false);
    }
  };

  const handleRunDailyNow = async (dayKey: DayOfWeekKey) => {
    setLoading(true);
    setSaveErrorMsg('');
    try {
      const res = await api.runDailyEmailAutomationNow(token, dayKey);
      setSaveSuccessMsg(res.message || `Triggered ${dayKey} automated email send.`);
      await loadDailyAutomation();
    } catch (err: unknown) {
      setSaveErrorMsg(err instanceof Error ? err.message : 'Failed to trigger daily email.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveBranding = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSaveErrorMsg('');
    try {
      const updated = await api.updateSettings(token, {
        emailBranding: brandingForm,
      });
      setSettings(updated);
      onRefreshPublicData();
      setSaveSuccessMsg('Email header, footer, branding, and Brevo batch throttle settings saved.');
    } catch (err: unknown) {
      setSaveErrorMsg(err instanceof Error ? err.message : 'Failed to save branding settings.');
    } finally {
      setLoading(false);
    }
  };

  const shiftMonth = (delta: number) => {
    const [y, m] = calendarMonth.split('-').map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    const next = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    setCalendarMonth(next);
    loadCalendar(next);
  };

  const handleSaveThankYouSettings = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);
    setSaveErrorMsg('');
    try {
      const updated = await api.updateSettings(token, {
        whatsappCommunityUrl: whatsappCommunityInput.trim(),
        telegramChannelUrl: telegramChannelInput.trim(),
        emailBranding: brandingForm,
      });
      setSettings(updated);
      onRefreshPublicData();
      setSaveSuccessMsg('Purchase Thank-You email template & community links saved.');
    } catch (err: unknown) {
      setSaveErrorMsg(err instanceof Error ? err.message : 'Failed to save thank-you settings.');
    } finally {
      setLoading(false);
    }
  };

  const handlePreviewThankYou = async () => {
    setSaveErrorMsg('');
    try {
      const preview = await api.previewThankYouEmail(token, {
        customerName: 'Adaobi Okafor',
        orderId: 'ZEEK-ORD-104928',
        brandingOverride: brandingForm,
        whatsappCommunityUrl: whatsappCommunityInput.trim(),
        telegramChannelUrl: telegramChannelInput.trim(),
      });
      setPreviewModal({ subject: preview.subject, html: preview.html });
    } catch (err: unknown) {
      setSaveErrorMsg(err instanceof Error ? err.message : 'Failed to preview thank-you email.');
    }
  };

  const handleSendTestThankYou = async () => {
    if (!thankYouTestEmail.trim()) {
      setSaveErrorMsg('Enter an email address to receive the test thank-you email.');
      return;
    }
    setLoading(true);
    setSaveErrorMsg('');
    try {
      await api.sendTestThankYouEmail(token, {
        to: thankYouTestEmail.trim(),
        brandingOverride: brandingForm,
        whatsappCommunityUrl: whatsappCommunityInput.trim(),
        telegramChannelUrl: telegramChannelInput.trim(),
      });
      setSaveSuccessMsg(`Test Purchase Thank-You email sent to ${thankYouTestEmail.trim()} via Brevo.`);
    } catch (err: unknown) {
      setSaveErrorMsg(err instanceof Error ? err.message : 'Test thank-you email failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleRetryThankYou = async (logId: string) => {
    setRetryingLogId(logId);
    setSaveErrorMsg('');
    try {
      const res = await api.retryThankYouEmail(token, logId);
      if (res.sent) {
        setSaveSuccessMsg('Purchase Thank-You email resent successfully via Brevo.');
      } else {
        setSaveErrorMsg(res.error || 'Retry attempt failed.');
      }
      await loadThankYouHistory();
    } catch (err: unknown) {
      setSaveErrorMsg(err instanceof Error ? err.message : 'Retry failed.');
    } finally {
      setRetryingLogId(null);
    }
  };

  const NAV_ITEMS: Array<{ id: EmailSubSection; label: string; badge?: number }> = [
    { id: 'overview', label: 'Email Overview Dashboard' },
    { id: 'all_contacts', label: 'All Contacts', badge: counts.all },
    { id: 'affiliates', label: 'Affiliates', badge: counts.affiliates },
    { id: 'new_customers', label: 'New Customers', badge: counts.newCustomers },
    { id: 'existing_customers', label: 'Existing Customers', badge: counts.existingCustomers },
    { id: 'repeat_customers', label: 'Repeat Customers', badge: counts.repeatCustomers },
    { id: 'new_emails', label: 'New Emails', badge: counts.newEmails },
    { id: 'manual_import', label: 'Import Contacts' },
    { id: 'campaigns', label: 'Bulk Email Campaigns' },
    { id: 'scheduled', label: 'Scheduled Campaigns' },
    { id: 'daily_automation', label: 'Automated Daily Emails' },
    { id: 'thank_you', label: 'Purchase Thank-You Email' },
    { id: 'branding', label: 'Email Templates & Branding' },
    { id: 'analytics', label: 'Email Analytics & Reports' },
    { id: 'calendar', label: 'Marketing Calendar' },
    { id: 'unsubscribed', label: 'Unsubscribed & Suppressed', badge: (counts.unsubscribed || 0) + (counts.suppressed || 0) },
  ];

  const currentDayObj = dailyConfig?.days?.[activeDay];

  const renderContactsTable = (title: string, subtitle: string, exportCategory?: string) => (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h4 className="text-lg font-black text-[#061B45]">{title}</h4>
          <p className="text-xs text-slate-500">{subtitle}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleSyncDatabase}
            className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#061B45] text-xs font-bold flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Sync Store Records</span>
          </button>
          <button
            type="button"
            onClick={() =>
              api.downloadAdminCsv(
                token,
                `/api/admin/email/contacts/export${exportCategory ? `?category=${encodeURIComponent(exportCategory)}` : ''}`,
                `zeek-contacts-${subSection}.csv`
              )
            }
            className="px-3 py-2 rounded-xl bg-[#061B45] hover:bg-[#0c2a63] text-white text-xs font-bold flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5 text-[#FF9200]" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={contactSearch}
            onChange={(e) => setContactSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && loadContactsForSection(subSection)}
            placeholder="Search email, name, or phone..."
            className="w-full pl-8 pr-3 py-2 text-xs rounded-xl border border-slate-200"
          />
        </div>

        {subSection !== 'unsubscribed' && (
          <select
            value={contactConsentFilter}
            onChange={(e) => setContactConsentFilter(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-semibold"
          >
            <option value="all">All Consent Statuses</option>
            <option value="subscribed">Subscribed (Promotional Opt-In)</option>
            <option value="pending">Pending Consent</option>
            <option value="unsubscribed">Unsubscribed</option>
            <option value="suppressed">Bounce Suppressed</option>
          </select>
        )}

        <select
          value={contactSourceFilter}
          onChange={(e) => setContactSourceFilter(e.target.value)}
          className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-semibold"
        >
          <option value="all">All Sources</option>
          <option value="customer_signup">Customer Signup</option>
          <option value="checkout">Checkout</option>
          <option value="paid_order">Paid Order</option>
          <option value="affiliate_registration">Affiliate Registration</option>
          <option value="contact_form">Contact Form</option>
          <option value="manual_add">Manual Add</option>
          <option value="csv_import">CSV Import</option>
          <option value="paste_import">Bulk Paste</option>
        </select>

        <button
          type="button"
          onClick={() => loadContactsForSection(subSection)}
          className="btn-zeek-orange px-4 py-2 rounded-xl text-xs font-bold"
        >
          Apply Filters
        </button>
      </div>

      {/* Contacts Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-x-auto">
        <table className="w-full text-xs text-left">
          <thead className="bg-[#061B45] text-white uppercase font-bold">
            <tr>
              <th className="p-3.5">Contact</th>
              <th className="p-3.5">Categories</th>
              <th className="p-3.5">Source & Collected</th>
              <th className="p-3.5">Purchases</th>
              <th className="p-3.5">Consent Status</th>
              <th className="p-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {contacts.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-slate-400">
                  No contacts match this view yet.
                </td>
              </tr>
            ) : (
              contacts.map((c) => {
                const isNewAff =
                  c.categories.includes('Affiliates') &&
                  Date.now() - new Date(c.createdAt).getTime() <= 14 * 86400000;
                return (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="p-3.5">
                      <strong className="text-[#061B45] block">{c.fullName || '—'}</strong>
                      <span className="font-mono text-[11px] text-slate-600">{c.email}</span>
                      {c.whatsApp && (
                        <span className="block text-[10px] text-slate-400">{c.whatsApp}</span>
                      )}
                    </td>
                    <td className="p-3.5">
                      <div className="flex flex-wrap gap-1">
                        {c.categories.map((cat) => (
                          <span
                            key={cat}
                            className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-bold"
                          >
                            {cat}
                          </span>
                        ))}
                        {isNewAff && (
                          <span className="px-2 py-0.5 rounded bg-orange-100 text-orange-700 text-[10px] font-bold">
                            New Affiliate (&le;14d)
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-3.5">
                      <span className="font-semibold text-slate-700 block capitalize">
                        {c.source.replace(/_/g, ' ')}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {c.createdAt?.slice(0, 10)}
                      </span>
                    </td>
                    <td className="p-3.5">
                      <span className="font-bold text-slate-800 block">{c.paidOrderCount} order(s)</span>
                      <span className="text-[11px] text-emerald-700 font-semibold">
                        ₦{(c.totalSpent || 0).toLocaleString('en-NG')}
                      </span>
                    </td>
                    <td className="p-3.5">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          c.marketingConsent === 'subscribed'
                            ? 'bg-emerald-100 text-emerald-800'
                            : c.marketingConsent === 'pending'
                            ? 'bg-slate-100 text-slate-600'
                            : c.marketingConsent === 'unsubscribed'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {c.marketingConsent}
                      </span>
                      {c.bounceCount > 0 && (
                        <span className="block text-[10px] text-red-600 mt-0.5">
                          Bounces: {c.bounceCount} {c.lastBounceReason ? `(${c.lastBounceReason})` : ''}
                        </span>
                      )}
                    </td>
                    <td className="p-3.5 text-right whitespace-nowrap space-x-1.5">
                      <button
                        type="button"
                        onClick={() => setEditingContact(c)}
                        className="p-1.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700"
                        title="Edit Contact"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      {deletingContactId === c.id ? (
                        <span className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleDeleteContact(c.id)}
                            className="px-2 py-1 rounded bg-red-600 text-white text-[10px] font-bold"
                          >
                            Confirm
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingContactId(null)}
                            className="px-2 py-1 rounded bg-slate-200 text-slate-700 text-[10px] font-bold"
                          >
                            No
                          </button>
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setDeletingContactId(c.id)}
                          className="p-1.5 rounded bg-red-50 hover:bg-red-100 text-red-600"
                          title="Delete Contact"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#FF7900]">
            Section A • Email Marketing, CRM & Brevo Automation
          </span>
          <h3 className="text-2xl font-black text-[#061B45]">
            Centralized Email Marketing Suite
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Capture & segment customers/affiliates automatically, run bulk Brevo campaigns, schedule Mon–Sun daily tips, and monitor live engagement.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setSubSection('manual_import')}
            className="btn-zeek-orange px-4 py-2.5 rounded-xl text-xs font-extrabold uppercase tracking-wider flex items-center gap-2 shadow-sm"
          >
            <Upload className="w-4 h-4" />
            <span>Import Contacts</span>
          </button>

          <button
            type="button"
            onClick={handleSyncDatabase}
            disabled={loading}
            className="px-4 py-2.5 rounded-xl bg-[#061B45] hover:bg-[#0c2a63] text-white text-xs font-bold flex items-center gap-2 shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 text-[#FF9200] ${loading ? 'animate-spin' : ''}`} />
            <span>Sync All Store & Affiliate Contacts</span>
          </button>
        </div>
      </div>

      {/* Horizontal Sub-Navigation */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap gap-1.5">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setSubSection(item.id)}
            className={`px-3 py-2 rounded-xl text-[11px] font-bold transition-colors flex items-center gap-1.5 ${
              subSection === item.id
                ? 'bg-[#FF7900] text-white shadow-sm'
                : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200/80'
            }`}
          >
            <span>{item.label}</span>
            {typeof item.badge === 'number' && (
              <span
                className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono ${
                  subSection === item.id ? 'bg-white/25 text-white' : 'bg-slate-200 text-slate-700'
                }`}
              >
                {item.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* 1. OVERVIEW DASHBOARD */}
      {subSection === 'overview' && overview && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: 'All Contacts', value: overview.kpis.totalContacts, color: 'text-[#061B45]' },
              { label: 'Affiliates', value: overview.kpis.affiliatesCount, color: 'text-indigo-700' },
              { label: 'New Customers', value: overview.kpis.newCustomersCount, color: 'text-sky-700' },
              { label: 'Existing Customers', value: overview.kpis.existingCustomersCount, color: 'text-emerald-700' },
              { label: 'Repeat Customers', value: overview.kpis.repeatCustomersCount, color: 'text-[#FF7900]' },
              { label: 'New Emails', value: overview.kpis.newEmailsCount, color: 'text-purple-700' },
            ].map((kpi) => (
              <div key={kpi.label} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                <span className="text-[10px] font-bold uppercase text-slate-500 block">{kpi.label}</span>
                <span className={`text-2xl font-black tabular-nums mt-1 block ${kpi.color}`}>
                  {kpi.value}
                </span>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl">
              <span className="text-[10px] font-bold uppercase text-emerald-700">Subscribed (Opted-In)</span>
              <div className="text-2xl font-black text-emerald-900 mt-1">{overview.kpis.subscribedCount}</div>
              <p className="text-[11px] text-emerald-700 mt-1">Eligible for promotional campaigns</p>
            </div>
            <div className="bg-slate-100 border border-slate-200 p-4 rounded-2xl">
              <span className="text-[10px] font-bold uppercase text-slate-600">Pending Consent</span>
              <div className="text-2xl font-black text-slate-900 mt-1">{overview.kpis.pendingConsentCount}</div>
              <p className="text-[11px] text-slate-600 mt-1">Collected without promotional opt-in</p>
            </div>
            <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl">
              <span className="text-[10px] font-bold uppercase text-amber-800">Unsubscribed</span>
              <div className="text-2xl font-black text-amber-950 mt-1">{overview.kpis.unsubscribedCount}</div>
              <p className="text-[11px] text-amber-700 mt-1">Automatically excluded</p>
            </div>
            <div className="bg-red-50 border border-red-200 p-4 rounded-2xl">
              <span className="text-[10px] font-bold uppercase text-red-700">Bounce Suppressed</span>
              <div className="text-2xl font-black text-red-900 mt-1">{overview.kpis.suppressedCount}</div>
              <p className="text-[11px] text-red-700 mt-1">Auto-blocked after repeated bounces</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-3">
              <h4 className="text-sm font-black text-[#061B45] flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#FF7900]" />
                <span>Automated Daily Email Status</span>
              </h4>
              <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <div>
                  <span className="text-slate-500 block">Master Switch:</span>
                  <strong className={overview.dailyAutomationSummary.enabled ? 'text-emerald-700' : 'text-slate-700'}>
                    {overview.dailyAutomationSummary.enabled ? 'Active (Running Daily)' : 'Paused'}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-500 block">Schedule Time:</span>
                  <strong className="text-[#061B45]">
                    {overview.dailyAutomationSummary.sendTime} ({overview.dailyAutomationSummary.timezone})
                  </strong>
                </div>
                <div>
                  <span className="text-slate-500 block">Active Days:</span>
                  <strong className="text-[#061B45]">{overview.dailyAutomationSummary.enabledDays} / 7 Days</strong>
                </div>
                <div>
                  <span className="text-slate-500 block">Open Rate / CTR:</span>
                  <strong className="text-[#FF7900]">
                    {overview.kpis.openRate}% / {overview.kpis.clickThroughRate}%
                  </strong>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setSubSection('campaigns')}
                  className="btn-zeek-orange px-4 py-2 rounded-xl text-xs font-bold"
                >
                  Create Bulk Campaign
                </button>
                <button
                  type="button"
                  onClick={() => setSubSection('daily_automation')}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#061B45] text-xs font-bold"
                >
                  Configure Mon–Sun Emails
                </button>
              </div>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-3">
              <h4 className="text-sm font-black text-[#061B45]">Recent Send Logs ({overview.recentLogs.length})</h4>
              <div className="space-y-1.5 max-h-56 overflow-y-auto text-xs">
                {overview.recentLogs.length === 0 ? (
                  <p className="text-slate-400 text-xs py-6 text-center">No campaign logs recorded yet.</p>
                ) : (
                  overview.recentLogs.slice(0, 12).map((log) => (
                    <div
                      key={log.id}
                      className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200/80"
                    >
                      <div className="min-w-0">
                        <strong className="text-[#061B45] block truncate">{log.recipientEmail}</strong>
                        <span className="text-[10px] text-slate-500 truncate block">{log.subject}</span>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase shrink-0 ${
                          log.status === 'delivered' || log.status === 'sent'
                            ? 'bg-emerald-100 text-emerald-800'
                            : log.status === 'bounced' || log.status === 'failed'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {log.status}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 text-xs text-blue-900 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
            <span>{overview.trackingNote}</span>
          </div>

          {providerStatus && (
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                        providerStatus.configured
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {providerStatus.configured ? 'Email / SMTP Connected' : 'Action Required'}
                    </span>
                    <span className="text-[11px] font-mono text-slate-500">
                      {providerStatus.endpoints.statusApi}
                    </span>
                  </div>
                  <h4 className="text-base font-black text-[#061B45] mt-1.5">
                    SMTP &amp; Brevo API Integration Status
                  </h4>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Active Transport: <strong className="text-[#061B45]">{providerStatus.providerLabel}</strong> •
                    Sender: <span className="font-mono">{providerStatus.sender.name} &lt;{providerStatus.sender.email}&gt;</span>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleVerifyEmailProvider}
                  disabled={verifyingProvider}
                  className="px-4 py-2 rounded-xl bg-[#061B45] hover:bg-[#0c2a63] text-white text-xs font-bold flex items-center gap-2 disabled:opacity-60"
                >
                  {verifyingProvider ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-[#FF9200]" />
                  ) : (
                    <RefreshCw className="w-3.5 h-3.5 text-[#FF9200]" />
                  )}
                  <span>Verify Live SMTP / Brevo</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="text-[11px] font-extrabold uppercase text-slate-600">
                    Environment Secret Flags (AI Studio Secrets / .env)
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                    {(Object.entries(providerStatus.envVars) as Array<[string, boolean]>).map(([key, isSet]) => (
                      <div
                        key={key}
                        className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-white border border-slate-200"
                      >
                        <span className="font-mono font-semibold text-slate-700 truncate">{key}</span>
                        <span
                          className={`font-bold text-[10px] uppercase ${
                            isSet ? 'text-emerald-700' : 'text-slate-400'
                          }`}
                        >
                          {isSet ? 'Set' : 'Missing'}
                        </span>
                      </div>
                    ))}
                  </div>
                  <p className="text-[11px] text-slate-500 pt-1">
                    Configure <span className="font-mono font-semibold">BREVO_API_KEY</span> (primary REST API) or{' '}
                    <span className="font-mono font-semibold">SMTP_HOST</span>,{' '}
                    <span className="font-mono font-semibold">SMTP_PORT</span>,{' '}
                    <span className="font-mono font-semibold">SMTP_USER</span>,{' '}
                    <span className="font-mono font-semibold">SMTP_PASS</span> in AI Studio Secrets or your server environment.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                  <div className="text-[11px] font-extrabold uppercase text-slate-600">
                    Transport Endpoints &amp; Quick Send Test
                  </div>
                  <div className="text-[11px] text-slate-600 space-y-1 font-mono bg-white p-3 rounded-xl border border-slate-200">
                    <div>REST API: {providerStatus.endpoints.brevoRestApi}</div>
                    <div>
                      SMTP Host: {providerStatus.smtp.host || 'smtp-relay.brevo.com (fallback)'} : {providerStatus.smtp.port} (
                      {providerStatus.smtp.secure ? 'TLS' : 'STARTTLS'})
                    </div>
                  </div>

                  {providerStatus.liveCheck && (
                    <div className="text-xs p-3 rounded-xl bg-white border border-slate-200 space-y-1">
                      <div className="font-bold text-[#061B45]">
                        Live Verification ({providerStatus.liveCheck.checkedAt.slice(0, 19).replace('T', ' ')} UTC):
                      </div>
                      {typeof providerStatus.liveCheck.brevoApiOk === 'boolean' && (
                        <div className={providerStatus.liveCheck.brevoApiOk ? 'text-emerald-700' : 'text-red-600'}>
                          Brevo API v3:{' '}
                          {providerStatus.liveCheck.brevoApiOk
                            ? `Connected (${providerStatus.liveCheck.verifiedSenders?.filter((s) => s.active).length || 0} active sender(s))`
                            : providerStatus.liveCheck.brevoError}
                        </div>
                      )}
                      {typeof providerStatus.liveCheck.smtpOk === 'boolean' && (
                        <div className={providerStatus.liveCheck.smtpOk ? 'text-emerald-700' : 'text-red-600'}>
                          SMTP Relay:{' '}
                          {providerStatus.liveCheck.smtpOk
                            ? 'SMTP handshake succeeded'
                            : providerStatus.liveCheck.smtpError}
                        </div>
                      )}
                      {!providerStatus.configured && (
                        <div className="text-amber-700">
                          Neither BREVO_API_KEY nor SMTP credentials are set in server environment secrets yet.
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <input
                      type="email"
                      value={diagnosticTestEmail}
                      onChange={(e) => setDiagnosticTestEmail(e.target.value)}
                      placeholder="you@example.com for live delivery test..."
                      className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white"
                    />
                    <button
                      type="button"
                      onClick={handleSendDiagnosticTestEmail}
                      disabled={sendingDiagnosticTest}
                      className="btn-zeek-orange px-4 py-2 rounded-xl text-xs font-bold shrink-0"
                    >
                      {sendingDiagnosticTest ? 'Sending...' : 'Test Send'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2–7 & 15: CONTACT CATEGORY VIEWS */}
      {subSection === 'all_contacts' &&
        renderContactsTable('All Contacts', 'Every unique email address captured or imported across Zeek Softwares.')}
      {subSection === 'affiliates' &&
        renderContactsTable('Affiliates & Newly Registered Affiliates', 'All registered affiliate partner emails and referral partners.', 'Affiliates')}
      {subSection === 'new_customers' &&
        renderContactsTable('New Customers', 'Customers who have completed their first verified purchase.', 'New Customers')}
      {subSection === 'existing_customers' &&
        renderContactsTable('Existing Customers', 'All customers with at least one verified purchase.', 'Existing Customers')}
      {subSection === 'repeat_customers' &&
        renderContactsTable('Repeat Customers', 'Loyal customers who have made two or more paid purchases.', 'Repeat Customers')}
      {subSection === 'new_emails' &&
        renderContactsTable('New Emails', 'Newly collected or manually imported email leads.', 'New Emails')}
      {subSection === 'unsubscribed' &&
        renderContactsTable('Unsubscribed & Suppressed Contacts', 'Opted-out or bounce-suppressed contacts excluded automatically from promotional sends.')}

      {/* 8. IMPORT CONTACTS (CSV COLUMN MAPPER + SINGLE ADD + BULK PASTE + HISTORY) */}
      {subSection === 'manual_import' && (
        <div className="space-y-6">
          {/* Interactive Mapped CSV Importer */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-5">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-[#FF7900]" />
                  <h4 className="text-base sm:text-lg font-black text-[#061B45]">
                    CSV Contact Import & Interactive Column Mapper
                  </h4>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Upload any `.csv` export (Mailchimp, Google Contacts, Excel, etc.), map columns, preview rows, choose duplicate rules, and import safely.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <input
                  ref={mappedCsvInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleMappedCsvFileUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => mappedCsvInputRef.current?.click()}
                  className="btn-zeek-orange px-4 py-2.5 rounded-xl text-xs font-extrabold uppercase tracking-wider flex items-center gap-1.5 shadow-sm"
                >
                  <Upload className="w-4 h-4" />
                  <span>{csvFileName ? 'Replace CSV File' : 'Select CSV File'}</span>
                </button>
              </div>
            </div>

            {csvRows.length > 0 ? (
              <div className="space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
                  <div>
                    <strong className="text-[#061B45]">Loaded File:</strong>{' '}
                    <span className="font-mono">{csvFileName}</span>
                    <span className="ml-2 px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">
                      {csvRows.length.toLocaleString()} row(s)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setCsvFileName('');
                      setCsvHeaders([]);
                      setCsvRows([]);
                    }}
                    className="text-xs font-bold text-red-600 hover:underline"
                  >
                    Clear CSV
                  </button>
                </div>

                {/* Column Mapping Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {[
                    { key: 'email' as const, label: 'Email Address Column *' },
                    { key: 'fullName' as const, label: 'Full Name Column (or First + Last)' },
                    { key: 'firstName' as const, label: 'First Name Column' },
                    { key: 'lastName' as const, label: 'Last Name Column' },
                    { key: 'whatsApp' as const, label: 'WhatsApp / Phone Column' },
                    { key: 'notes' as const, label: 'Notes / Tag Column' },
                  ].map((field) => (
                    <div key={field.key}>
                      <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                        {field.label}
                      </label>
                      <select
                        value={csvMapping[field.key]}
                        onChange={(e) =>
                          setCsvMapping((prev) => ({ ...prev, [field.key]: e.target.value }))
                        }
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white font-semibold"
                      >
                        <option value="">-- Not Mapped --</option>
                        {csvHeaders.map((h, idx) => (
                          <option key={`${h}-${idx}`} value={String(idx)}>
                            {h} {csvHasHeaderRow ? `(Col ${idx + 1})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>

                {/* First 5 Rows Preview */}
                <div className="space-y-2">
                  <div className="text-[11px] font-bold uppercase text-slate-600">
                    Mapped Preview (First {Math.min(5, csvRows.length)} of {csvRows.length} rows)
                  </div>
                  <div className="overflow-x-auto rounded-2xl border border-slate-200">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-[#061B45] text-white uppercase text-[10px]">
                        <tr>
                          <th className="p-2.5">Email</th>
                          <th className="p-2.5">Name Preview</th>
                          <th className="p-2.5">WhatsApp</th>
                          <th className="p-2.5">Notes</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {csvRows.slice(0, 5).map((row, idx) => {
                          const eVal = csvMapping.email !== '' ? row[Number(csvMapping.email)] : '';
                          const fullVal =
                            csvMapping.fullName !== ''
                              ? row[Number(csvMapping.fullName)]
                              : [
                                  csvMapping.firstName !== '' ? row[Number(csvMapping.firstName)] : '',
                                  csvMapping.lastName !== '' ? row[Number(csvMapping.lastName)] : '',
                                ]
                                  .filter(Boolean)
                                  .join(' ');
                          const waVal = csvMapping.whatsApp !== '' ? row[Number(csvMapping.whatsApp)] : '';
                          const noteVal = csvMapping.notes !== '' ? row[Number(csvMapping.notes)] : '';
                          return (
                            <tr key={idx}>
                              <td className="p-2.5 font-mono text-[#061B45]">{eVal || '—'}</td>
                              <td className="p-2.5">{fullVal || '—'}</td>
                              <td className="p-2.5">{waVal || '—'}</td>
                              <td className="p-2.5 text-slate-500">{noteVal || '—'}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Duplicate Rule, Categories & Consent Safeguard */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                    <span className="block text-[11px] font-bold uppercase text-slate-600">
                      Duplicate Email Handling Rule
                    </span>
                    <label className="flex items-start gap-2 text-xs cursor-pointer">
                      <input
                        type="radio"
                        name="csvDuplicateMode"
                        checked={csvDuplicateMode === 'skip'}
                        onChange={() => setCsvDuplicateMode('skip')}
                        className="mt-0.5"
                      />
                      <span>
                        <strong>Skip existing emails</strong> (recommended — preserves existing records unchanged)
                      </span>
                    </label>
                    <label className="flex items-start gap-2 text-xs cursor-pointer">
                      <input
                        type="radio"
                        name="csvDuplicateMode"
                        checked={csvDuplicateMode === 'update'}
                        onChange={() => setCsvDuplicateMode('update')}
                        className="mt-0.5"
                      />
                      <span>
                        <strong>Update contact details</strong> (fills missing name/phone/notes & merges categories; never reactivates unsubscribed/suppressed contacts)
                      </span>
                    </label>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                    <span className="block text-[11px] font-bold uppercase text-slate-600">
                      Assign Target Categories
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {CONTACT_CATEGORIES.map((cat) => (
                        <label
                          key={cat}
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-xs cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={csvCategories.includes(cat)}
                            onChange={(e) =>
                              setCsvCategories((prev) =>
                                e.target.checked ? [...prev, cat] : prev.filter((c) => c !== cat)
                              )
                            }
                          />
                          <span>{cat}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                <label className="flex items-start gap-2.5 text-xs text-slate-700 bg-amber-50 border border-amber-200 p-3.5 rounded-xl cursor-pointer">
                  <input
                    type="checkbox"
                    checked={csvPermission}
                    onChange={(e) => setCsvPermission(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded"
                  />
                  <span>
                    <strong>Marketing Permission & Compliance Guard:</strong> Check only if these contacts opted in to promotional emails (unchecked = imported safely as Pending Consent). Unsubscribed and bounce-suppressed contacts are permanently protected and will never be reactivated.
                  </span>
                </label>

                <button
                  type="button"
                  disabled={loading || csvMapping.email === ''}
                  onClick={handleSubmitMappedCsvImport}
                  className="btn-zeek-orange w-full py-3.5 rounded-xl text-xs font-extrabold uppercase tracking-wider flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  <span>
                    {loading ? 'Importing Mapped CSV...' : `Import ${csvRows.length.toLocaleString()} Mapped Rows`}
                  </span>
                </button>
              </div>
            ) : (
              <div className="p-6 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/70 text-center space-y-2">
                <p className="text-xs font-semibold text-slate-600">
                  No CSV file selected yet. Click <strong>Select CSV File</strong> above to upload and map columns (`email`, `name`, `phone`, `notes`), preview rows, and control duplicates.
                </p>
              </div>
            )}

            {importReport && (
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs space-y-2">
                <div className="font-black text-[#061B45]">Latest Import Result Summary</div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                  <div>Parsed: <strong>{importReport.totalParsed}</strong></div>
                  <div className="text-emerald-700">New Added: <strong>{importReport.imported}</strong></div>
                  <div className="text-blue-700">Updated: <strong>{importReport.updated}</strong></div>
                  <div className="text-slate-700">Existing Skipped: <strong>{importReport.skippedExisting ?? 0}</strong></div>
                  <div className="text-amber-700">Intra-File Dupes: <strong>{importReport.duplicatesSkipped}</strong></div>
                  <div className="text-purple-700">Opt-Out Protected: <strong>{importReport.suppressedProtected ?? 0}</strong></div>
                </div>
                {importReport.invalidEmails.length > 0 && (
                  <div className="text-red-600 pt-1">
                    Invalid ({importReport.invalidEmails.length}): {importReport.invalidEmails.slice(0, 8).join(', ')}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Single Manual Add */}
            <form
              onSubmit={handleAddSingleContact}
              className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4"
            >
              <div>
                <h4 className="text-base font-black text-[#061B45]">Add Individual Email Contact</h4>
                <p className="text-xs text-slate-500">Add a single email manually and assign categories.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    name="email"
                    autoComplete="email"
                    required
                    value={singleEmail}
                    onChange={(e) => setSingleEmail(e.target.value)}
                    placeholder="client@example.com"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    name="name"
                    autoComplete="name"
                    value={singleName}
                    onChange={(e) => setSingleName(e.target.value)}
                    placeholder="Optional full name"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                    WhatsApp Phone
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    autoComplete="tel"
                    value={singleWhatsApp}
                    onChange={(e) => setSingleWhatsApp(e.target.value)}
                    placeholder="+234..."
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                    Marketing Consent
                  </label>
                  <select
                    value={singleConsent}
                    onChange={(e) => setSingleConsent(e.target.value as MarketingConsentStatus)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white"
                  >
                    <option value="pending">Pending Consent (Transactional only)</option>
                    <option value="subscribed">Subscribed (Verified opt-in)</option>
                  </select>
                </div>
              </div>

              <div>
                <span className="block text-[11px] font-bold uppercase text-slate-600 mb-1.5">
                  Assign Categories
                </span>
                <div className="flex flex-wrap gap-2">
                  {CONTACT_CATEGORIES.map((cat) => (
                    <label
                      key={cat}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={singleCategories.includes(cat)}
                        onChange={(e) =>
                          setSingleCategories((prev) =>
                            e.target.checked ? [...prev, cat] : prev.filter((c) => c !== cat)
                          )
                        }
                      />
                      <span>{cat}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                  Admin Notes
                </label>
                <input
                  type="text"
                  value={singleNotes}
                  onChange={(e) => setSingleNotes(e.target.value)}
                  placeholder="Optional CRM notes"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
                />
              </div>

              <button
                type="submit"
                className="btn-zeek-orange w-full py-3 rounded-xl text-xs font-extrabold uppercase tracking-wider flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>Add Contact</span>
              </button>
            </form>

            {/* Quick Bulk Paste */}
            <form
              onSubmit={handleBulkImport}
              className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className="text-base font-black text-[#061B45]">
                    Quick Bulk Paste Import (1,000+ Emails)
                  </h4>
                  <p className="text-xs text-slate-500">
                    Paste emails line-by-line or load raw CSV text (`email,fullName,whatsApp`). Duplicates & invalid formats are filtered automatically.
                  </p>
                </div>
                <input
                  ref={csvInputRef}
                  type="file"
                  accept=".csv,.txt"
                  onChange={handleCsvFileChange}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => csvInputRef.current?.click()}
                  className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#061B45] text-xs font-bold flex items-center gap-1.5 shrink-0"
                >
                  <FileSpreadsheet className="w-4 h-4 text-[#FF7900]" />
                  <span>Load Text/CSV</span>
                </button>
              </div>

              <textarea
                rows={7}
                value={bulkText}
                onChange={(e) => {
                  setBulkText(e.target.value);
                  if (bulkSource !== 'csv_import') setBulkSource('paste_import');
                }}
                placeholder={`ada@example.com, Adaobi Okafor\nchinedu@company.ng, Chinedu Obi, 08031234567\nbisi@domain.com`}
                className="w-full px-3.5 py-2.5 text-xs font-mono rounded-xl border border-slate-300"
              />

              <div>
                <span className="block text-[11px] font-bold uppercase text-slate-600 mb-1.5">
                  Target Categories for Imported Contacts
                </span>
                <div className="flex flex-wrap gap-2">
                  {CONTACT_CATEGORIES.map((cat) => (
                    <label
                      key={cat}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={bulkCategories.includes(cat)}
                        onChange={(e) =>
                          setBulkCategories((prev) =>
                            e.target.checked ? [...prev, cat] : prev.filter((c) => c !== cat)
                          )
                        }
                      />
                      <span>{cat}</span>
                    </label>
                  ))}
                </div>
              </div>

              <label className="flex items-start gap-2.5 text-xs text-slate-700 bg-amber-50 border border-amber-200 p-3 rounded-xl cursor-pointer">
                <input
                  type="checkbox"
                  checked={bulkPermission}
                  onChange={(e) => setBulkPermission(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded"
                />
                <span>
                  <strong>Permission Confirmation:</strong> These imported contacts explicitly opted in to receive promotional emails from Zeek Softwares (unchecked = saved as Pending Consent).
                </span>
              </label>

              <button
                type="submit"
                disabled={loading || !bulkText.trim()}
                className="btn-zeek-orange w-full py-3 rounded-xl text-xs font-extrabold uppercase tracking-wider flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Upload className="w-4 h-4" />
                <span>{loading ? 'Processing Import...' : 'Validate & Import Contacts'}</span>
              </button>
            </form>
          </div>

          {/* Persisted CSV & Bulk Import History */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-[#FF7900]" />
                <h4 className="text-base font-black text-[#061B45]">CSV & Contact Import History</h4>
              </div>
              <button
                type="button"
                onClick={loadImportHistory}
                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-[#061B45] flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Refresh</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="p-2.5">Date</th>
                    <th className="p-2.5">File / Source</th>
                    <th className="p-2.5">Rule</th>
                    <th className="p-2.5">Added</th>
                    <th className="p-2.5">Updated</th>
                    <th className="p-2.5">Skipped</th>
                    <th className="p-2.5">Protected</th>
                    <th className="p-2.5">Invalid</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {importHistory.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-6 text-center text-slate-400">
                        No CSV or bulk imports recorded yet.
                      </td>
                    </tr>
                  ) : (
                    importHistory.map((item) => (
                      <tr key={item.id}>
                        <td className="p-2.5 font-mono text-[11px] whitespace-nowrap">
                          {item.createdAt?.slice(0, 16).replace('T', ' ')}
                        </td>
                        <td className="p-2.5">
                          <strong className="text-[#061B45] block">{item.fileName}</strong>
                          <span className="text-[10px] text-slate-500 capitalize">
                            {item.source.replace(/_/g, ' ')} • {item.categories.join(', ')}
                          </span>
                        </td>
                        <td className="p-2.5 uppercase font-bold text-[10px]">{item.duplicateMode}</td>
                        <td className="p-2.5 font-bold text-emerald-700">{item.imported}</td>
                        <td className="p-2.5 font-bold text-blue-700">{item.updated}</td>
                        <td className="p-2.5 text-slate-600">{item.skippedExisting + item.duplicatesSkipped}</td>
                        <td className="p-2.5 text-purple-700 font-semibold">{item.suppressedProtected}</td>
                        <td className="p-2.5 text-red-600">{item.invalidCount}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 9 & 10. BULK EMAIL CAMPAIGNS & SCHEDULED CAMPAIGNS */}
      {(subSection === 'campaigns' || subSection === 'scheduled') && (
        <div className="space-y-6">
          {subSection === 'campaigns' && (
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <h4 className="text-lg font-black text-[#061B45]">
                    {campaignForm.id ? 'Edit Email Campaign' : 'Compose Bulk Email Campaign'}
                  </h4>
                  <p className="text-xs text-slate-500">
                    Automatically wrapped with Zeek Softwares header logo, footer social links, personalization (`{'{{firstName}}'}`), and compliance unsubscribe footer.
                  </p>
                </div>
                {campaignForm.id && (
                  <button
                    type="button"
                    onClick={() => setCampaignForm({ ...campaignForm, id: undefined, name: '' })}
                    className="px-3 py-1.5 rounded-lg bg-slate-100 text-xs font-bold text-slate-700"
                  >
                    + New Campaign
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left Builder */}
                <div className="lg:col-span-7 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                        Internal Campaign Name *
                      </label>
                      <input
                        type="text"
                        value={campaignForm.name}
                        onChange={(e) => setCampaignForm({ ...campaignForm, name: e.target.value })}
                        placeholder="e.g. Monthly Pro Promo"
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                        Email Subject Line *
                      </label>
                      <input
                        type="text"
                        value={campaignForm.subject}
                        onChange={(e) => setCampaignForm({ ...campaignForm, subject: e.target.value })}
                        placeholder="e.g. {{firstName}}, unlock your software discount today"
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                      Preheader Text (Optional Inbox Preview)
                    </label>
                    <input
                      type="text"
                      value={campaignForm.preheader}
                      onChange={(e) => setCampaignForm({ ...campaignForm, preheader: e.target.value })}
                      placeholder="Short preview snippet..."
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-bold uppercase text-slate-600">
                        Email Message Body (HTML Supported) *
                      </label>
                      <div className="flex gap-1.5">
                        {['{{firstName}}', '{{fullName}}'].map((tok) => (
                          <button
                            key={tok}
                            type="button"
                            onClick={() =>
                              setCampaignForm({ ...campaignForm, htmlBody: `${campaignForm.htmlBody} ${tok}` })
                            }
                            className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-[10px] font-mono font-bold text-[#061B45]"
                          >
                            + {tok}
                          </button>
                        ))}
                      </div>
                    </div>
                    <textarea
                      rows={7}
                      value={campaignForm.htmlBody}
                      onChange={(e) => setCampaignForm({ ...campaignForm, htmlBody: e.target.value })}
                      className="w-full px-3 py-2.5 text-xs font-mono rounded-xl border border-slate-300"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                        Banner Image URL
                      </label>
                      <div className="flex gap-1.5">
                        <input
                          type="text"
                          value={campaignForm.bannerImageUrl}
                          onChange={(e) =>
                            setCampaignForm({ ...campaignForm, bannerImageUrl: e.target.value })
                          }
                          placeholder="https://..."
                          className="w-full px-2.5 py-2 text-xs rounded-xl border border-slate-300"
                        />
                        <label className="px-2.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold cursor-pointer flex items-center shrink-0">
                          {uploadingBanner ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImageIcon className="w-3.5 h-3.5" />}
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              setUploadingBanner(true);
                              try {
                                const url = await uploadAssetFile(file);
                                setCampaignForm((prev) => ({ ...prev, bannerImageUrl: url }));
                              } catch (err: unknown) {
                                setSaveErrorMsg(err instanceof Error ? err.message : 'Banner upload failed.');
                              } finally {
                                setUploadingBanner(false);
                              }
                            }}
                          />
                        </label>
                      </div>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                        CTA Button Label
                      </label>
                      <input
                        type="text"
                        value={campaignForm.ctaLabel}
                        onChange={(e) => setCampaignForm({ ...campaignForm, ctaLabel: e.target.value })}
                        placeholder="Explore Plans"
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                        CTA Destination URL
                      </label>
                      <input
                        type="text"
                        value={campaignForm.ctaUrl}
                        onChange={(e) => setCampaignForm({ ...campaignForm, ctaUrl: e.target.value })}
                        placeholder="https://..."
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
                      />
                    </div>
                  </div>
                </div>

                {/* Right Targeting & Sending Controls */}
                <div className="lg:col-span-5 bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4">
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                      Target Audience Mode
                    </label>
                    <select
                      value={campaignForm.targetType}
                      onChange={(e) =>
                        setCampaignForm({ ...campaignForm, targetType: e.target.value as CampaignTargetType })
                      }
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white font-bold"
                    >
                      <option value="all">All Subscribed Contacts</option>
                      <option value="categories">Specific Mailing Categories</option>
                      <option value="segments">Smart Customer Segments</option>
                      <option value="individuals">Individual Emails (Direct List)</option>
                    </select>
                  </div>

                  {campaignForm.targetType === 'categories' && (
                    <div className="flex flex-wrap gap-1.5">
                      {CONTACT_CATEGORIES.map((cat) => (
                        <label
                          key={cat}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-xs cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={campaignForm.targetCategories.includes(cat)}
                            onChange={(e) =>
                              setCampaignForm({
                                ...campaignForm,
                                targetCategories: e.target.checked
                                  ? [...campaignForm.targetCategories, cat]
                                  : campaignForm.targetCategories.filter((c) => c !== cat),
                              })
                            }
                          />
                          <span>{cat}</span>
                        </label>
                      ))}
                    </div>
                  )}

                  {campaignForm.targetType === 'segments' && (
                    <div className="space-y-3 bg-white p-3.5 rounded-xl border border-slate-200 text-xs">
                      <label className="flex items-center gap-2 font-semibold cursor-pointer">
                        <input
                          type="checkbox"
                          checked={campaignForm.neverPurchasedOnly}
                          onChange={(e) =>
                            setCampaignForm({ ...campaignForm, neverPurchasedOnly: e.target.checked })
                          }
                        />
                        <span>Contacts Who Have Never Purchased</span>
                      </label>

                      <div>
                        <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                          Not Purchased Within Last (Days)
                        </label>
                        <input
                          type="number"
                          min={0}
                          value={campaignForm.inactiveDays}
                          onChange={(e) =>
                            setCampaignForm({ ...campaignForm, inactiveDays: Number(e.target.value) || 0 })
                          }
                          className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300"
                        />
                      </div>

                      <div>
                        <span className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                          Purchased Specific Products
                        </span>
                        <div className="max-h-28 overflow-y-auto space-y-1">
                          {products.map((p) => (
                            <label key={p.id} className="flex items-center gap-2 text-[11px] cursor-pointer">
                              <input
                                type="checkbox"
                                checked={campaignForm.targetProductIds.includes(p.id)}
                                onChange={(e) =>
                                  setCampaignForm({
                                    ...campaignForm,
                                    targetProductIds: e.target.checked
                                      ? [...campaignForm.targetProductIds, p.id]
                                      : campaignForm.targetProductIds.filter((id) => id !== p.id),
                                  })
                                }
                              />
                              <span>{p.name}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {campaignForm.targetType === 'individuals' && (
                    <div>
                      <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                        Recipient Email Addresses (Comma or line separated)
                      </label>
                      <textarea
                        rows={3}
                        value={campaignForm.targetEmailsText}
                        onChange={(e) =>
                          setCampaignForm({ ...campaignForm, targetEmailsText: e.target.value })
                        }
                        placeholder="user1@example.com, user2@example.com"
                        className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-300 bg-white"
                      />
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleEstimateAudience}
                    className="w-full py-2 rounded-xl bg-white border border-slate-300 hover:bg-slate-100 text-xs font-bold text-[#061B45]"
                  >
                    Estimate Eligible Consented Audience
                  </button>

                  {audienceEstimate && (
                    <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs space-y-1">
                      <div>
                        Eligible Subscribed Recipients: <strong>{audienceEstimate.eligibleCount}</strong>
                      </div>
                      <div className="text-[11px] text-slate-600">
                        Pending/Unconsented Excluded: {audienceEstimate.pendingExcludedCount}
                      </div>
                    </div>
                  )}

                  {/* Schedule & Preview & Test Send */}
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                      Schedule Date & Time (Optional)
                    </label>
                    <input
                      type="datetime-local"
                      value={campaignForm.scheduledFor}
                      onChange={(e) => setCampaignForm({ ...campaignForm, scheduledFor: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white"
                    />
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="email"
                      name="campaignTestEmail"
                      autoComplete="email"
                      value={testEmailAddress}
                      onChange={(e) => setTestEmailAddress(e.target.value)}
                      placeholder="Test email address..."
                      className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white"
                    />
                    <button
                      type="button"
                      onClick={handleSendTestCampaign}
                      className="px-3 py-2 rounded-xl bg-[#061B45] text-white text-xs font-bold shrink-0"
                    >
                      Send Test
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handlePreviewCampaign}
                      className="py-2.5 rounded-xl bg-white border border-slate-300 hover:bg-slate-100 text-xs font-bold text-[#061B45] flex items-center justify-center gap-1.5"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Preview</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSaveCampaign('save_draft')}
                      className="py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-xs font-bold text-slate-800"
                    >
                      Save Draft
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSaveCampaign('schedule')}
                      className="py-2.5 rounded-xl bg-[#061B45] hover:bg-[#0c2a63] text-white text-xs font-bold"
                    >
                      Schedule Send
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSaveCampaign('send_now')}
                      className="btn-zeek-orange py-2.5 rounded-xl text-xs font-extrabold uppercase flex items-center justify-center gap-1.5"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Send Now</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Campaigns Table */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <h4 className="text-base font-black text-[#061B45]">
              {subSection === 'scheduled' ? 'Scheduled Campaigns Queue' : 'All Campaigns History & Queue'}
            </h4>

            <div className="space-y-3">
              {campaigns
                .filter((c) => (subSection === 'scheduled' ? c.status === 'scheduled' : true))
                .map((camp) => (
                  <div
                    key={camp.id}
                    className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-4"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <strong className="text-sm text-[#061B45]">{camp.name}</strong>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-white border border-slate-300 text-slate-700">
                          {camp.status}
                        </span>
                        {camp.scheduledFor && (
                          <span className="text-[11px] font-mono text-slate-500">
                            Scheduled: {camp.scheduledFor.slice(0, 16).replace('T', ' ')}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-600">{camp.subject}</p>
                      <div className="flex flex-wrap gap-3 text-[11px] text-slate-500">
                        <span>Target: {camp.totalRecipients}</span>
                        <span className="text-emerald-700 font-semibold">Sent: {camp.sentCount}</span>
                        <span>Opens: {camp.openCount}</span>
                        <span>Clicks: {camp.clickCount}</span>
                        {camp.failedCount > 0 && (
                          <span className="text-red-600 font-semibold">Failed: {camp.failedCount}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      {camp.status === 'sending' && (
                        <button
                          type="button"
                          onClick={() => handleCampaignAction(camp.id, 'pause')}
                          className="px-2.5 py-1.5 rounded-lg bg-amber-100 text-amber-800 text-xs font-bold flex items-center gap-1"
                        >
                          <Pause className="w-3 h-3" /> Pause
                        </button>
                      )}
                      {camp.status === 'paused' && (
                        <button
                          type="button"
                          onClick={() => handleCampaignAction(camp.id, 'resume')}
                          className="px-2.5 py-1.5 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center gap-1"
                        >
                          <Play className="w-3 h-3" /> Resume
                        </button>
                      )}
                      {(camp.status === 'draft' || camp.status === 'scheduled') && (
                        <button
                          type="button"
                          onClick={() => handleCampaignAction(camp.id, 'send_now')}
                          className="btn-zeek-orange px-3 py-1.5 rounded-lg text-xs font-bold"
                        >
                          Send Now
                        </button>
                      )}
                      {['draft', 'scheduled', 'paused'].includes(camp.status) && (
                        <button
                          type="button"
                          onClick={() => handleCampaignAction(camp.id, 'cancel')}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-200 text-slate-700 text-xs font-bold"
                        >
                          Cancel
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleCampaignAction(camp.id, 'delete')}
                        className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600"
                        title="Delete Campaign"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* 11. AUTOMATED DAILY EMAILS (MONDAY-SUNDAY) */}
      {subSection === 'daily_automation' && dailyConfig && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h4 className="text-lg font-black text-[#061B45]">
                Automated Daily Emails (Monday – Sunday)
              </h4>
              <p className="text-xs text-slate-500">
                Customize all 7 daily templates, target subscribed categories, daily send time, and duplicate-run safeguard.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold cursor-pointer">
                <input
                  type="checkbox"
                  checked={dailyConfig.enabled}
                  onChange={(e) => setDailyConfig({ ...dailyConfig, enabled: e.target.checked })}
                  className="w-4 h-4 rounded text-[#FF7900]"
                />
                <span>{dailyConfig.enabled ? 'Master Automation Enabled' : 'Master Automation Paused'}</span>
              </label>

              <button
                type="button"
                onClick={handleSaveDailyConfig}
                disabled={loading}
                className="btn-zeek-orange px-4 py-2.5 rounded-xl text-xs font-extrabold uppercase tracking-wider"
              >
                Save Daily Automation
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <div>
              <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                Daily Send Time ({dailyConfig.timezone})
              </label>
              <input
                type="time"
                value={dailyConfig.sendTime}
                onChange={(e) => setDailyConfig({ ...dailyConfig, sendTime: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white"
              />
            </div>

            <div className="md:col-span-2">
              <span className="block text-[11px] font-bold uppercase text-slate-600 mb-1.5">
                Target Categories (Only Subscribed Opted-In Contacts Receive)
              </span>
              <div className="flex flex-wrap gap-2">
                {CONTACT_CATEGORIES.map((cat) => (
                  <label
                    key={cat}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-xs cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={dailyConfig.targetCategories.includes(cat)}
                      onChange={(e) =>
                        setDailyConfig({
                          ...dailyConfig,
                          targetCategories: e.target.checked
                            ? [...dailyConfig.targetCategories, cat]
                            : dailyConfig.targetCategories.filter((c) => c !== cat),
                        })
                      }
                    />
                    <span>{cat}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* 7 Day Tabs */}
          <div className="flex flex-wrap gap-1.5">
            {DAYS_OF_WEEK.map((d) => {
              const tmpl = dailyConfig.days[d.key];
              return (
                <button
                  key={d.key}
                  type="button"
                  onClick={() => setActiveDay(d.key)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors ${
                    activeDay === d.key
                      ? 'bg-[#061B45] text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <span>{d.label}</span>
                  <span
                    className={`w-2 h-2 rounded-full ${
                      tmpl?.enabled ? 'bg-emerald-400' : 'bg-slate-400'
                    }`}
                  />
                </button>
              );
            })}
          </div>

          {/* Selected Day Editor */}
          {currentDayObj && (
            <div className="border border-slate-200 rounded-2xl p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h5 className="text-base font-black text-[#061B45]">{currentDayObj.title}</h5>
                  {currentDayObj.lastRunDate && (
                    <span className="text-[11px] font-mono text-slate-500">
                      Last Run: {currentDayObj.lastRunDate}
                    </span>
                  )}
                </div>

                <label className="flex items-center gap-2 text-xs font-bold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={currentDayObj.enabled}
                    onChange={(e) => updateDayTemplate(activeDay, { enabled: e.target.checked })}
                    className="w-4 h-4 rounded text-[#FF7900]"
                  />
                  <span>Enable {activeDay} Email</span>
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                    Template Title
                  </label>
                  <input
                    type="text"
                    value={currentDayObj.title}
                    onChange={(e) => updateDayTemplate(activeDay, { title: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                    Email Subject
                  </label>
                  <input
                    type="text"
                    value={currentDayObj.subject}
                    onChange={(e) => updateDayTemplate(activeDay, { subject: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                  Greeting Line
                </label>
                <input
                  type="text"
                  value={currentDayObj.greetingTemplate}
                  onChange={(e) => updateDayTemplate(activeDay, { greetingTemplate: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                  Message Content (HTML)
                </label>
                <textarea
                  rows={5}
                  value={currentDayObj.bodyHtml}
                  onChange={(e) => updateDayTemplate(activeDay, { bodyHtml: e.target.value })}
                  className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-300"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                    Optional Image URL
                  </label>
                  <input
                    type="text"
                    value={currentDayObj.imageUrl || ''}
                    onChange={(e) => updateDayTemplate(activeDay, { imageUrl: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                    CTA Button Label
                  </label>
                  <input
                    type="text"
                    value={currentDayObj.ctaLabel || ''}
                    onChange={(e) => updateDayTemplate(activeDay, { ctaLabel: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                    CTA Button URL
                  </label>
                  <input
                    type="text"
                    value={currentDayObj.ctaUrl || ''}
                    onChange={(e) => updateDayTemplate(activeDay, { ctaUrl: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
                <div className="flex items-center gap-2">
                  <input
                    type="email"
                    name="dailyTestEmail"
                    autoComplete="email"
                    value={dailyTestEmail}
                    onChange={(e) => setDailyTestEmail(e.target.value)}
                    placeholder="Test email address..."
                    className="px-3 py-2 text-xs rounded-xl border border-slate-300"
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      if (!dailyTestEmail.trim()) return;
                      try {
                        await api.sendTestBrandedEmail(token, {
                          to: dailyTestEmail.trim(),
                          subject: currentDayObj.subject,
                          greeting: currentDayObj.greetingTemplate,
                          bodyHtml: currentDayObj.bodyHtml,
                          imageUrl: currentDayObj.imageUrl,
                          ctaLabel: currentDayObj.ctaLabel,
                          ctaUrl: currentDayObj.ctaUrl,
                        });
                        setSaveSuccessMsg(`Test email sent to ${dailyTestEmail.trim()}.`);
                      } catch (err: unknown) {
                        setSaveErrorMsg(err instanceof Error ? err.message : 'Test send failed.');
                      }
                    }}
                    className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-[#061B45]"
                  >
                    Send Test Email
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={async () => {
                      const prev = await api.previewBrandedEmail(token, {
                        subject: currentDayObj.subject,
                        greeting: currentDayObj.greetingTemplate,
                        bodyHtml: currentDayObj.bodyHtml,
                        imageUrl: currentDayObj.imageUrl,
                        ctaLabel: currentDayObj.ctaLabel,
                        ctaUrl: currentDayObj.ctaUrl,
                        sampleName: 'Valued Subscriber',
                      });
                      setPreviewModal(prev);
                    }}
                    className="px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs font-bold text-[#061B45] flex items-center gap-1.5"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Preview Template</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRunDailyNow(activeDay)}
                    className="px-4 py-2 rounded-xl bg-[#061B45] hover:bg-[#0c2a63] text-white text-xs font-bold"
                  >
                    Run {activeDay} Email Now
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 11B. PURCHASE THANK-YOU EMAIL AUTOMATION & COMMUNITY LINKS */}
      {subSection === 'thank_you' && (
        <div className="space-y-6">
          <form
            onSubmit={handleSaveThankYouSettings}
            className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-5"
          >
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <Heart className="w-5 h-5 text-[#FF7900]" />
                  <h4 className="text-lg font-black text-[#061B45]">
                    Automatic Purchase Thank-You Email
                  </h4>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Automatically sends once via Brevo after every verified paid order. Includes your official logo and dynamic WhatsApp & Telegram community join buttons from Site Settings.
                </p>
              </div>

              <label className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold cursor-pointer">
                <input
                  type="checkbox"
                  checked={brandingForm.thankYouEnabled ?? true}
                  onChange={(e) =>
                    setBrandingForm({ ...brandingForm, thankYouEnabled: e.target.checked })
                  }
                  className="w-4 h-4 rounded text-[#FF7900]"
                />
                <span>
                  {brandingForm.thankYouEnabled ?? true
                    ? 'Thank-You Email Enabled'
                    : 'Thank-You Email Paused'}
                </span>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                  Thank-You Email Subject *
                </label>
                <input
                  type="text"
                  required
                  value={brandingForm.thankYouSubject || ''}
                  onChange={(e) =>
                    setBrandingForm({ ...brandingForm, thankYouSubject: e.target.value })
                  }
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                  Greeting Headline *
                </label>
                <input
                  type="text"
                  required
                  value={brandingForm.thankYouGreeting || ''}
                  onChange={(e) =>
                    setBrandingForm({ ...brandingForm, thankYouGreeting: e.target.value })
                  }
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
                />
              </div>
            </div>

            <div>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                <label className="text-[11px] font-bold uppercase text-slate-600">
                  Thank-You Message Body (HTML Supported) *
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {['{{firstName}}', '{{orderId}}', '{{itemsSummary}}', '{{amount}}', '{{storeName}}'].map(
                    (tok) => (
                      <button
                        key={tok}
                        type="button"
                        onClick={() =>
                          setBrandingForm({
                            ...brandingForm,
                            thankYouBodyHtml: `${brandingForm.thankYouBodyHtml || ''} ${tok}`,
                          })
                        }
                        className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-[10px] font-mono font-bold text-[#061B45]"
                      >
                        + {tok}
                      </button>
                    )
                  )}
                </div>
              </div>
              <textarea
                rows={4}
                required
                value={brandingForm.thankYouBodyHtml || ''}
                onChange={(e) =>
                  setBrandingForm({ ...brandingForm, thankYouBodyHtml: e.target.value })
                }
                className="w-full px-3.5 py-2.5 text-xs font-mono rounded-xl border border-slate-300"
              />
            </div>

            {/* Dynamic Community Links & Button Labels (Synced directly with Site Settings) */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-4">
              <div>
                <span className="text-xs font-black text-[#061B45] block">
                  Synced Community Buttons & Destination Links
                </span>
                <p className="text-[11px] text-slate-500">
                  Changes here update your storefront & Thank-You emails dynamically. Leave a URL blank to hide that community button.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                    WhatsApp Community URL (Synced with Site Settings)
                  </label>
                  <input
                    type="url"
                    name="whatsappCommunityUrl"
                    autoComplete="url"
                    value={whatsappCommunityInput}
                    onChange={(e) => setWhatsappCommunityInput(e.target.value)}
                    placeholder="https://chat.whatsapp.com/..."
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                    WhatsApp Button Label
                  </label>
                  <input
                    type="text"
                    value={brandingForm.thankYouWhatsappBtnLabel || ''}
                    onChange={(e) =>
                      setBrandingForm({ ...brandingForm, thankYouWhatsappBtnLabel: e.target.value })
                    }
                    placeholder="JOIN OUR WHATSAPP COMMUNITY"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                    Telegram Channel / Community URL (Synced with Site Settings)
                  </label>
                  <input
                    type="url"
                    name="telegramChannelUrl"
                    autoComplete="url"
                    value={telegramChannelInput}
                    onChange={(e) => setTelegramChannelInput(e.target.value)}
                    placeholder="https://t.me/..."
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                    Telegram Button Label
                  </label>
                  <input
                    type="text"
                    value={brandingForm.thankYouTelegramBtnLabel || ''}
                    onChange={(e) =>
                      setBrandingForm({ ...brandingForm, thankYouTelegramBtnLabel: e.target.value })
                    }
                    placeholder="JOIN OUR TELEGRAM COMMUNITY"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white"
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="email"
                  name="thankYouTestEmail"
                  autoComplete="email"
                  value={thankYouTestEmail}
                  onChange={(e) => setThankYouTestEmail(e.target.value)}
                  placeholder="Test recipient email..."
                  className="px-3 py-2 text-xs rounded-xl border border-slate-300"
                />
                <button
                  type="button"
                  onClick={handleSendTestThankYou}
                  disabled={loading}
                  className="px-3.5 py-2 rounded-xl bg-[#061B45] hover:bg-[#0c2a63] text-white text-xs font-bold"
                >
                  Send Test Email
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handlePreviewThankYou}
                  className="px-4 py-2.5 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-xs font-bold text-[#061B45] flex items-center gap-1.5"
                >
                  <Eye className="w-4 h-4" />
                  <span>Preview Email</span>
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-zeek-orange px-5 py-2.5 rounded-xl text-xs font-extrabold uppercase tracking-wider"
                >
                  Save Thank-You Settings
                </button>
              </div>
            </div>
          </form>

          {/* Thank-You Email Delivery History */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h4 className="text-base font-black text-[#061B45]">
                  Purchase Thank-You Delivery History
                </h4>
                <p className="text-xs text-slate-500">
                  Tracks every automatic post-purchase thank-you email with one-click retry if Brevo fails.
                </p>
              </div>
              <button
                type="button"
                onClick={loadThankYouHistory}
                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-[#061B45] flex items-center gap-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-[#061B45] text-white uppercase text-[10px]">
                  <tr>
                    <th className="p-3">Date</th>
                    <th className="p-3">Order ID</th>
                    <th className="p-3">Recipient</th>
                    <th className="p-3">Subject</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {thankYouHistory.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-400">
                        No automatic purchase thank-you emails logged yet.
                      </td>
                    </tr>
                  ) : (
                    thankYouHistory.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50">
                        <td className="p-3 font-mono text-[11px] whitespace-nowrap">
                          {(log.sentAt || log.createdAt)?.slice(0, 16).replace('T', ' ')}
                        </td>
                        <td className="p-3 font-mono font-bold text-[#061B45]">
                          {log.orderId || '—'}
                        </td>
                        <td className="p-3">
                          <strong className="block text-slate-800">{log.recipientName || 'Customer'}</strong>
                          <span className="font-mono text-[11px] text-slate-500">{log.recipientEmail}</span>
                        </td>
                        <td className="p-3 text-slate-600 max-w-xs truncate">{log.subject}</td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              log.status === 'delivered' || log.status === 'sent'
                                ? 'bg-emerald-100 text-emerald-800'
                                : log.status === 'failed' || log.status === 'bounced'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-slate-200 text-slate-700'
                            }`}
                          >
                            {log.status}
                          </span>
                          {log.error && (
                            <span className="block text-[10px] text-red-600 mt-0.5">{log.error}</span>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          {(log.status === 'failed' || log.status === 'bounced') && (
                            <button
                              type="button"
                              disabled={retryingLogId === log.id}
                              onClick={() => handleRetryThankYou(log.id)}
                              className="px-3 py-1.5 rounded-lg bg-[#FF7900] hover:bg-orange-600 text-white text-[11px] font-bold inline-flex items-center gap-1 disabled:opacity-50"
                            >
                              {retryingLogId === log.id ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <RotateCcw className="w-3 h-3" />
                              )}
                              <span>Retry</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 12. EMAIL TEMPLATES & BRANDING */}
      {subSection === 'branding' && (
        <form
          onSubmit={handleSaveBranding}
          className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-5"
        >
          <div>
            <h4 className="text-lg font-black text-[#061B45]">
              Email Header, Footer, Brand Identity & Brevo Quota
            </h4>
            <p className="text-xs text-slate-500">
              All transactional and promotional emails pull your active store name, tagline, light/main logo (`{settings.lightLogoUrl || settings.logoUrl || 'Brand Logo'}`), colors, and social URLs from Site Settings.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                Storefront Public Website URL
              </label>
              <input
                type="url"
                value={brandingForm.websiteUrl || ''}
                onChange={(e) => setBrandingForm({ ...brandingForm, websiteUrl: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                Footer Note
              </label>
              <input
                type="text"
                value={brandingForm.footerNote || ''}
                onChange={(e) => setBrandingForm({ ...brandingForm, footerNote: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <input
              type="url"
              value={brandingForm.facebookUrl || ''}
              onChange={(e) => setBrandingForm({ ...brandingForm, facebookUrl: e.target.value })}
              placeholder="Facebook Page URL"
              className="px-3 py-2 text-xs rounded-xl border border-slate-300"
            />
            <input
              type="url"
              value={brandingForm.instagramUrl || ''}
              onChange={(e) => setBrandingForm({ ...brandingForm, instagramUrl: e.target.value })}
              placeholder="Instagram Profile URL"
              className="px-3 py-2 text-xs rounded-xl border border-slate-300"
            />
            <input
              type="url"
              value={brandingForm.twitterUrl || ''}
              onChange={(e) => setBrandingForm({ ...brandingForm, twitterUrl: e.target.value })}
              placeholder="X / Twitter URL"
              className="px-3 py-2 text-xs rounded-xl border border-slate-300"
            />
            <input
              type="url"
              value={brandingForm.youtubeUrl || ''}
              onChange={(e) => setBrandingForm({ ...brandingForm, youtubeUrl: e.target.value })}
              placeholder="YouTube Channel URL"
              className="px-3 py-2 text-xs rounded-xl border border-slate-300"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                Paid Order Confirmation Subject Template
              </label>
              <input
                type="text"
                value={brandingForm.orderConfirmationSubject || ''}
                onChange={(e) =>
                  setBrandingForm({ ...brandingForm, orderConfirmationSubject: e.target.value })
                }
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                Paid Order Confirmation Intro Template
              </label>
              <input
                type="text"
                value={brandingForm.orderConfirmationIntro || ''}
                onChange={(e) =>
                  setBrandingForm({ ...brandingForm, orderConfirmationIntro: e.target.value })
                }
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <div>
              <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                Batch Size per Worker Tick
              </label>
              <input
                type="number"
                min={1}
                max={200}
                value={brandingForm.batchSize ?? 25}
                onChange={(e) =>
                  setBrandingForm({ ...brandingForm, batchSize: Number(e.target.value) || 25 })
                }
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                Delay Between Emails (ms)
              </label>
              <input
                type="number"
                min={100}
                max={15000}
                value={brandingForm.batchDelayMs ?? 1200}
                onChange={(e) =>
                  setBrandingForm({ ...brandingForm, batchDelayMs: Number(e.target.value) || 1200 })
                }
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                Brevo Daily Promotional Quota Cap
              </label>
              <input
                type="number"
                min={10}
                max={50000}
                value={brandingForm.dailySendLimit ?? 280}
                onChange={(e) =>
                  setBrandingForm({ ...brandingForm, dailySendLimit: Number(e.target.value) || 280 })
                }
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-zeek-orange px-6 py-3 rounded-xl text-xs font-extrabold uppercase tracking-wider"
          >
            Save Email Branding & Quota Settings
          </button>
        </form>
      )}

      {/* 13. ANALYTICS & REPORTS */}
      {subSection === 'analytics' && overview && (
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-wrap items-end justify-between gap-4">
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">From Date</label>
                <input
                  type="date"
                  value={analyticsFrom}
                  onChange={(e) => setAnalyticsFrom(e.target.value)}
                  className="px-3 py-2 text-xs rounded-xl border border-slate-300"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">To Date</label>
                <input
                  type="date"
                  value={analyticsTo}
                  onChange={(e) => setAnalyticsTo(e.target.value)}
                  className="px-3 py-2 text-xs rounded-xl border border-slate-300"
                />
              </div>
              <button
                type="button"
                onClick={() => loadOverview(analyticsFrom, analyticsTo)}
                className="btn-zeek-orange px-4 py-2 rounded-xl text-xs font-bold"
              >
                Filter Range
              </button>
            </div>

            <button
              type="button"
              onClick={() =>
                api.downloadAdminCsv(token, '/api/admin/email/analytics/export', 'zeek-email-analytics.csv')
              }
              className="px-4 py-2 rounded-xl bg-[#061B45] text-white text-xs font-bold flex items-center gap-1.5"
            >
              <Download className="w-4 h-4 text-[#FF9200]" />
              <span>Export CSV Report</span>
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Total Emails Sent', value: overview.kpis.totalEmailsSent },
              { label: 'Open Rate', value: `${overview.kpis.openRate}%` },
              { label: 'Click-Through Rate (CTR)', value: `${overview.kpis.clickThroughRate}%` },
              { label: 'Unsubscribe Rate', value: `${overview.kpis.unsubscribeRate}%` },
            ].map((card) => (
              <div key={card.label} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <span className="text-[10px] font-bold uppercase text-slate-500 block">{card.label}</span>
                <span className="text-2xl font-black text-[#061B45] mt-1 block">{card.value}</span>
              </div>
            ))}
          </div>

          {/* Campaign Performance Comparison Table & Visual Bars */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <h4 className="text-base font-black text-[#061B45]">Campaign Performance Comparison</h4>
            <div className="space-y-3">
              {overview.campaigns.length === 0 ? (
                <p className="text-xs text-slate-400">No campaigns to compare yet.</p>
              ) : (
                overview.campaigns.map((camp) => {
                  const openPct = camp.sentCount ? Math.min(100, Math.round((camp.openCount / camp.sentCount) * 100)) : 0;
                  const clickPct = camp.sentCount ? Math.min(100, Math.round((camp.clickCount / camp.sentCount) * 100)) : 0;
                  return (
                    <div key={camp.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                      <div className="flex flex-wrap justify-between text-xs">
                        <strong className="text-[#061B45]">{camp.name}</strong>
                        <span className="text-slate-500">
                          Sent: {camp.sentCount} • Opens: {camp.openCount} ({openPct}%) • Clicks: {camp.clickCount} ({clickPct}%)
                        </span>
                      </div>
                      <div className="space-y-1">
                        <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                          <div className="h-full bg-[#FF7900]" style={{ width: `${openPct}%` }} />
                        </div>
                        <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-600" style={{ width: `${clickPct}%` }} />
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {overview.brevoRecentEvents.length > 0 && (
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-3">
              <h4 className="text-sm font-black text-[#061B45]">Live Brevo Webhook / SMTP Events</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 text-slate-700 font-bold">
                    <tr>
                      <th className="p-2.5">Event</th>
                      <th className="p-2.5">Email</th>
                      <th className="p-2.5">Subject / Reason</th>
                      <th className="p-2.5">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {overview.brevoRecentEvents.slice(0, 15).map((ev, idx) => (
                      <tr key={idx}>
                        <td className="p-2.5 font-bold uppercase text-[10px]">{ev.event}</td>
                        <td className="p-2.5 font-mono">{ev.email}</td>
                        <td className="p-2.5 text-slate-600">{ev.subject || ev.reason || '—'}</td>
                        <td className="p-2.5 font-mono text-[11px]">{ev.date?.slice(0, 19)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 14. MARKETING CALENDAR */}
      {subSection === 'calendar' && calendarData && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h4 className="text-lg font-black text-[#061B45]">Marketing & Automation Calendar</h4>
              <p className="text-xs text-slate-500">
                View scheduled campaigns, sent history, drafts, and automated Mon–Sun sends. Overlap warnings trigger when sends collide within the same hour.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => shiftMonth(-1)}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="font-mono text-sm font-black text-[#061B45] px-2">{calendarData.month}</span>
              <button
                type="button"
                onClick={() => shiftMonth(1)}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {calendarData.conflicts.length > 0 && (
            <div className="p-4 rounded-2xl bg-red-50 border border-red-200 space-y-1 text-xs text-red-800">
              <div className="font-bold flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-red-600" />
                <span>Scheduling Conflict Warning(s)</span>
              </div>
              {calendarData.conflicts.map((c, idx) => (
                <p key={idx}>• {c.message}</p>
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {calendarData.events.length === 0 ? (
              <p className="text-xs text-slate-400 col-span-full text-center py-8">
                No campaigns or active daily automation runs for this month.
              </p>
            ) : (
              calendarData.events.map((ev) => (
                <div
                  key={ev.id}
                  className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50 space-y-1 text-xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono font-bold text-[#061B45]">
                      {ev.date} • {ev.time}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        ev.type === 'daily_automation'
                          ? 'bg-orange-100 text-orange-800'
                          : ev.type === 'sent_campaign'
                          ? 'bg-emerald-100 text-emerald-800'
                          : ev.type === 'scheduled_campaign'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {ev.type.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="font-bold text-slate-900">{ev.title}</div>
                  <div className="text-[11px] text-slate-500 truncate">{ev.subject}</div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* EDIT CONTACT MODAL */}
      {editingContact && (
        <div className="fixed inset-0 z-[120] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveEditedContact}
            className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200"
          >
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h4 className="text-base font-black text-[#061B45]">Edit Email Contact</h4>
              <button type="button" onClick={() => setEditingContact(null)}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <div className="text-xs font-mono text-slate-500">{editingContact.email}</div>

            <div>
              <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">Full Name</label>
              <input
                type="text"
                name="name"
                autoComplete="name"
                value={editingContact.fullName || ''}
                onChange={(e) => setEditingContact({ ...editingContact, fullName: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">Marketing Consent</label>
              <select
                value={editingContact.marketingConsent}
                onChange={(e) =>
                  setEditingContact({
                    ...editingContact,
                    marketingConsent: e.target.value as MarketingConsentStatus,
                  })
                }
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white"
              >
                <option value="subscribed">subscribed</option>
                <option value="pending">pending</option>
                <option value="unsubscribed">unsubscribed</option>
                <option value="suppressed">suppressed</option>
              </select>
            </div>
            <div>
              <span className="block text-[11px] font-bold uppercase text-slate-600 mb-1">Categories</span>
              <div className="flex flex-wrap gap-1.5">
                {CONTACT_CATEGORIES.map((cat) => (
                  <label key={cat} className="flex items-center gap-1 px-2 py-1 rounded bg-slate-50 border text-xs">
                    <input
                      type="checkbox"
                      checked={editingContact.categories.includes(cat)}
                      onChange={(e) =>
                        setEditingContact({
                          ...editingContact,
                          categories: e.target.checked
                            ? [...editingContact.categories, cat]
                            : editingContact.categories.filter((c) => c !== cat),
                        })
                      }
                    />
                    <span>{cat}</span>
                  </label>
                ))}
              </div>
            </div>
            <button type="submit" className="btn-zeek-orange w-full py-2.5 rounded-xl text-xs font-bold uppercase">
              Save Contact Changes
            </button>
          </form>
        </div>
      )}

      {/* BRANDED EMAIL PREVIEW MODAL */}
      {previewModal && (
        <div className="fixed inset-0 z-[125] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl border border-slate-200 flex flex-col max-h-[85vh]">
            <div className="p-4 bg-[#061B45] text-white flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-[#FF9200] block">Branded Email Preview</span>
                <strong className="text-sm">{previewModal.subject}</strong>
              </div>
              <button type="button" onClick={() => setPreviewModal(null)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 bg-slate-100">
              <iframe
                title={previewModal.subject || 'Branded Email Preview'}
                srcDoc={previewModal.html}
                sandbox=""
                className="w-full h-[65vh] bg-white rounded-xl shadow border border-slate-200"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
