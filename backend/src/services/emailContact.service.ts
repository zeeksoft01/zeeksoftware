import crypto from 'crypto';
import {
  EmailContact,
  EmailContactCategory,
  EmailContactSource,
  EmailImportHistoryItem,
  MarketingConsentStatus,
  Order,
} from '../types';
import {
  AffiliateModel,
  EmailContactModel,
  EmailImportHistoryModel,
  InquiryModel,
  OrderModel,
  UserModel,
} from '../models';
import { requireDatabaseConnection } from '../config/database';
import { ApiError } from '../utils/ApiError';
import { auditService } from './audit.service';

const EMAIL_REGEX = /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)+$/i;

export const ALL_STANDARD_CATEGORIES: EmailContactCategory[] = [
  'All Contacts',
  'Affiliates',
  'Newly Registered Affiliates',
  'New Customers',
  'Existing Customers',
  'Repeat Customers',
  'New Emails',
];

export const normalizeEmail = (email: string): string => String(email || '').trim().toLowerCase();

export const isValidEmailFormat = (email: string): boolean => {
  const clean = normalizeEmail(email);
  return clean.length >= 5 && clean.length <= 254 && EMAIL_REGEX.test(clean);
};

export interface ParsedImportContact {
  email: string;
  fullName: string;
  whatsApp?: string;
  notes?: string;
}

export const parseBulkEmailInput = (
  rawText: string
): {
  valid: ParsedImportContact[];
  invalid: string[];
  duplicatesRemoved: number;
} => {
  const seen = new Set<string>();
  const valid: ParsedImportContact[] = [];
  const invalid: string[] = [];
  let duplicatesRemoved = 0;

  const lines = String(rawText || '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return { valid, invalid, duplicatesRemoved };
  }

  // Detect CSV header row if present
  const firstCols = lines[0].split(',').map((c) => c.trim().replace(/^["']|["']$/g, '').toLowerCase());
  const hasHeader =
    firstCols.some((c) => c === 'email' || c === 'e-mail' || c === 'email address') ||
    (firstCols.length > 1 && firstCols.some((c) => c.includes('email')));

  let emailColIdx = 0;
  let nameColIdx = -1;
  let whatsappColIdx = -1;
  let notesColIdx = -1;
  let startIdx = 0;

  if (hasHeader) {
    emailColIdx = firstCols.findIndex((c) => c === 'email' || c === 'e-mail' || c.includes('email'));
    if (emailColIdx < 0) emailColIdx = 0;
    nameColIdx = firstCols.findIndex(
      (c) => c.includes('name') || c === 'fullname' || c === 'full_name'
    );
    whatsappColIdx = firstCols.findIndex(
      (c) => c.includes('whatsapp') || c.includes('phone') || c.includes('tel')
    );
    notesColIdx = firstCols.findIndex((c) => c.includes('note'));
    startIdx = 1;
  }

  for (let i = startIdx; i < lines.length; i++) {
    const line = lines[i];

    // CSV row with detected header or multiple comma-separated columns with non-email fields
    if (hasHeader || (line.includes(',') && !/^[^,]+@[^,]+,[^,]+@[^,]+/.test(line))) {
      const cols = line
        .split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/)
        .map((c) => c.trim().replace(/^["']|["']$/g, ''));

      const rawEmail = cols[emailColIdx] || cols.find((c) => c.includes('@')) || '';
      const cleanEmail = normalizeEmail(rawEmail);

      if (cleanEmail && isValidEmailFormat(cleanEmail)) {
        if (seen.has(cleanEmail)) {
          duplicatesRemoved++;
        } else {
          seen.add(cleanEmail);
          valid.push({
            email: cleanEmail,
            fullName: nameColIdx >= 0 ? cols[nameColIdx] || '' : '',
            whatsApp: whatsappColIdx >= 0 ? cols[whatsappColIdx] || undefined : undefined,
            notes: notesColIdx >= 0 ? cols[notesColIdx] || undefined : undefined,
          });
        }
        continue;
      } else if (hasHeader) {
        if (rawEmail) invalid.push(rawEmail);
        continue;
      }
    }

    // Free-form token extraction (commas, semicolons, spaces, tabs, "Name <email@domain.com>")
    const angleMatches = [...line.matchAll(/(?:"?([^"<,;]+)"?\s*)?<([^>\s]+@[^>\s]+)>/g)];
    if (angleMatches.length > 0) {
      for (const m of angleMatches) {
        const cleanEmail = normalizeEmail(m[2]);
        if (!isValidEmailFormat(cleanEmail)) {
          invalid.push(m[2]);
          continue;
        }
        if (seen.has(cleanEmail)) {
          duplicatesRemoved++;
          continue;
        }
        seen.add(cleanEmail);
        valid.push({ email: cleanEmail, fullName: (m[1] || '').trim() });
      }
      continue;
    }

    const tokens = line
      .split(/[\s,;]+/)
      .map((t) => t.trim().replace(/^["'<]|["'>]$/g, ''))
      .filter(Boolean);

    for (const token of tokens) {
      const cleanEmail = normalizeEmail(token);
      if (isValidEmailFormat(cleanEmail)) {
        if (seen.has(cleanEmail)) {
          duplicatesRemoved++;
        } else {
          seen.add(cleanEmail);
          valid.push({ email: cleanEmail, fullName: '' });
        }
      } else {
        invalid.push(token);
      }
    }
  }

  return { valid, invalid, duplicatesRemoved };
};

const deriveCategories = (
  contact: Partial<EmailContact>,
  extraCategories: string[] = [],
  options?: { removeCategories?: string[] }
): string[] => {
  const catSet = new Set<string>(['All Contacts']);

  // Preserve manual / non-customer-lifecycle tags first
  for (const existing of contact.categories || []) {
    if (existing) catSet.add(existing);
  }
  for (const extra of extraCategories) {
    if (extra?.trim()) catSet.add(extra.trim());
  }

  // Affiliates
  if (contact.affiliateId) {
    catSet.add('Affiliates');
    const createdMs = contact.collectedAt ? Date.parse(contact.collectedAt) : Date.now();
    const ageDays = (Date.now() - (Number.isNaN(createdMs) ? Date.now() : createdMs)) / 86_400_000;
    if (ageDays <= 14) {
      catSet.add('Newly Registered Affiliates');
    } else {
      catSet.delete('Newly Registered Affiliates');
    }
  }

  // Customer purchase lifecycle segmentation
  const paidCount = contact.paidOrderCount ?? 0;
  if (paidCount >= 2) {
    catSet.delete('New Customers');
    catSet.add('Existing Customers');
    catSet.add('Repeat Customers');
    catSet.delete('New Emails');
  } else if (paidCount === 1) {
    catSet.add('New Customers');
    catSet.add('Existing Customers');
    catSet.delete('Repeat Customers');
    catSet.delete('New Emails');
  } else if ((contact.orderCount ?? 0) === 0 && !contact.affiliateId && catSet.size <= 2) {
    catSet.add('New Emails');
  }

  for (const rem of options?.removeCategories || []) {
    if (rem !== 'All Contacts') catSet.delete(rem);
  }

  return Array.from(catSet);
};

export const emailContactService = {
  async upsertCollectedEmail(input: {
    email: string;
    fullName?: string;
    whatsApp?: string;
    source: EmailContactSource;
    categories?: string[];
    userId?: string;
    affiliateId?: string;
    explicitOptIn?: boolean;
    consentSource?: string;
    notes?: string;
    collectedAt?: string;
  }): Promise<EmailContact | null> {
    requireDatabaseConnection();
    const cleanEmail = normalizeEmail(input.email);
    if (!isValidEmailFormat(cleanEmail)) return null;

    const now = new Date().toISOString();
    const existing = await EmailContactModel.findOne({ email: cleanEmail }).lean();

    if (!existing) {
      const consentStatus: MarketingConsentStatus = input.explicitOptIn ? 'subscribed' : 'pending';
      const baseContact: EmailContact = {
        id: `emc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        email: cleanEmail,
        fullName: (input.fullName || '').trim(),
        whatsApp: input.whatsApp?.trim() || undefined,
        source: input.source,
        categories: ['All Contacts'],
        ...(input.userId ? { userId: input.userId } : {}),
        ...(input.affiliateId ? { affiliateId: input.affiliateId } : {}),
        orderCount: 0,
        paidOrderCount: 0,
        totalSpent: 0,
        purchasedProductIds: [],
        marketingConsent: consentStatus,
        ...(input.explicitOptIn
          ? {
              consentSource: input.consentSource || input.source,
              consentTimestamp: now,
            }
          : {}),
        unsubscribeToken: crypto.randomBytes(24).toString('hex'),
        bounceCount: 0,
        ...(input.notes ? { notes: input.notes.trim() } : {}),
        collectedAt: input.collectedAt || now,
        createdAt: now,
        updatedAt: now,
      };

      const initialExtras = [...(input.categories || [])];
      if (
        ['manual', 'csv_import', 'paste_import', 'contact_form', 'checkout'].includes(input.source) &&
        !input.affiliateId &&
        initialExtras.length === 0
      ) {
        initialExtras.push('New Emails');
      }
      baseContact.categories = deriveCategories(baseContact, initialExtras);

      try {
        await EmailContactModel.create(baseContact);
        return baseContact;
      } catch {
        // Race condition fallback if concurrent upsert inserted it first
        const raced = await EmailContactModel.findOne({ email: cleanEmail }).lean();
        if (raced) {
          const { _id, ...rest } = raced;
          return rest as EmailContact;
        }
        return null;
      }
    }

    // Merge updates cleanly without clobbering unsubscribed/suppressed status or losing categories
    const mergedPartial: Partial<EmailContact> = {
      ...existing,
      fullName: existing.fullName || (input.fullName || '').trim(),
      whatsApp: existing.whatsApp || input.whatsApp?.trim() || undefined,
      userId: existing.userId || input.userId,
      affiliateId: existing.affiliateId || input.affiliateId,
      notes: input.notes?.trim() || existing.notes,
    };

    const nextCategories = deriveCategories(mergedPartial, input.categories || []);
    const setFields: Record<string, unknown> = {
      fullName: mergedPartial.fullName,
      categories: nextCategories,
      updatedAt: now,
    };
    if (mergedPartial.whatsApp) setFields.whatsApp = mergedPartial.whatsApp;
    if (mergedPartial.userId) setFields.userId = mergedPartial.userId;
    if (mergedPartial.affiliateId) setFields.affiliateId = mergedPartial.affiliateId;
    if (mergedPartial.notes) setFields.notes = mergedPartial.notes;

    // Respect prior unsubscribe/suppression unless user explicitly re-subscribes via dedicated endpoint
    if (
      input.explicitOptIn &&
      existing.marketingConsent !== 'unsubscribed' &&
      existing.marketingConsent !== 'suppressed'
    ) {
      setFields.marketingConsent = 'subscribed';
      setFields.consentSource = input.consentSource || input.source;
      setFields.consentTimestamp = now;
    }

    const updated = await EmailContactModel.findOneAndUpdate(
      { email: cleanEmail },
      { $set: setFields },
      { new: true }
    ).lean();
    if (!updated) return null;
    const { _id, ...rest } = updated;
    return rest as EmailContact;
  },

  async recordOrderCheckout(order: Order, explicitOptIn?: boolean): Promise<void> {
    requireDatabaseConnection();
    const cleanEmail = normalizeEmail(order.customerEmail);
    if (!isValidEmailFormat(cleanEmail)) return;

    await this.upsertCollectedEmail({
      email: cleanEmail,
      fullName: order.customerName,
      whatsApp: order.customerWhatsApp,
      source: 'checkout',
      explicitOptIn,
      consentSource: explicitOptIn ? 'checkout_opt_in' : undefined,
    });

    await EmailContactModel.updateOne(
      { email: cleanEmail },
      {
        $inc: { orderCount: 1 },
        $set: { updatedAt: new Date().toISOString() },
      }
    );
  },

  async recordPurchaseCompletion(order: Order): Promise<void> {
    requireDatabaseConnection();
    const cleanEmail = normalizeEmail(order.customerEmail);
    if (!isValidEmailFormat(cleanEmail)) return;

    let contact = await this.upsertCollectedEmail({
      email: cleanEmail,
      fullName: order.customerName,
      whatsApp: order.customerWhatsApp,
      source: 'purchase',
    });
    if (!contact) return;

    // Recompute exact authoritative purchase count from Orders collection to stay idempotent
    const paidOrders = await OrderModel.find({
      customerEmail: cleanEmail,
      paymentStatus: 'paid',
    })
      .sort({ createdAt: 1 })
      .lean();

    const paidOrderCount = paidOrders.length;
    const totalSpent = paidOrders.reduce((acc, o) => acc + (o.totalAmount || 0), 0);
    const lastPurchaseAt =
      paidOrders[paidOrders.length - 1]?.verifiedAt ||
      paidOrders[paidOrders.length - 1]?.createdAt ||
      new Date().toISOString();
    const purchasedProductIds = Array.from(
      new Set(
        paidOrders.flatMap((o) => (o.items || []).map((i) => i.productId).filter(Boolean))
      )
    );
    const totalOrders = await OrderModel.countDocuments({ customerEmail: cleanEmail });

    const nextCategories = deriveCategories({
      ...contact,
      orderCount: totalOrders,
      paidOrderCount,
    });

    await EmailContactModel.updateOne(
      { email: cleanEmail },
      {
        $set: {
          orderCount: totalOrders,
          paidOrderCount,
          totalSpent,
          lastPurchaseAt,
          purchasedProductIds,
          categories: nextCategories,
          updatedAt: new Date().toISOString(),
        },
      }
    );
  },

  async syncAllExistingRecords(): Promise<{ synced: number }> {
    requireDatabaseConnection();
    const [users, affiliates, orders, inquiries] = await Promise.all([
      UserModel.find().lean(),
      AffiliateModel.find().lean(),
      OrderModel.find().sort({ createdAt: 1 }).lean(),
      InquiryModel.find().sort({ createdAt: 1 }).lean(),
    ]);

    const affiliateByUserId = new Map<string, string>();
    for (const aff of affiliates) {
      affiliateByUserId.set(String(aff.userId), String(aff._id));
    }

    let synced = 0;

    for (const u of users) {
      if (u.role === 'admin') continue;
      const affId = affiliateByUserId.get(String(u._id));
      const res = await this.upsertCollectedEmail({
        email: u.email,
        fullName: u.fullName || u.name || '',
        whatsApp: u.phone || '',
        source: affId ? 'affiliate_registration' : 'customer_registration',
        categories: affId ? ['Affiliates'] : [],
        userId: String(u._id),
        affiliateId: affId,
        collectedAt: u.createdAt,
      });
      if (res) synced++;
    }

    // Aggregate order metrics per customer email
    const orderStatsByEmail = new Map<
      string,
      {
        name: string;
        whatsApp: string;
        totalOrders: number;
        paidOrders: number;
        totalSpent: number;
        lastPaidAt?: string;
        productIds: Set<string>;
        firstOrderAt: string;
      }
    >();

    for (const ord of orders) {
      const email = normalizeEmail(ord.customerEmail);
      if (!isValidEmailFormat(email)) continue;
      let entry = orderStatsByEmail.get(email);
      if (!entry) {
        entry = {
          name: ord.customerName,
          whatsApp: ord.customerWhatsApp,
          totalOrders: 0,
          paidOrders: 0,
          totalSpent: 0,
          productIds: new Set<string>(),
          firstOrderAt: ord.createdAt,
        };
        orderStatsByEmail.set(email, entry);
      }
      entry.totalOrders++;
      if (ord.paymentStatus === 'paid') {
        entry.paidOrders++;
        entry.totalSpent += ord.totalAmount || 0;
        entry.lastPaidAt = ord.verifiedAt || ord.createdAt;
        for (const it of ord.items || []) {
          if (it.productId) entry.productIds.add(it.productId);
        }
      }
    }

    for (const [email, stat] of orderStatsByEmail.entries()) {
      const contact = await this.upsertCollectedEmail({
        email,
        fullName: stat.name,
        whatsApp: stat.whatsApp,
        source: stat.paidOrders > 0 ? 'purchase' : 'checkout',
        collectedAt: stat.firstOrderAt,
      });
      if (contact) {
        const categories = deriveCategories({
          ...contact,
          orderCount: stat.totalOrders,
          paidOrderCount: stat.paidOrders,
        });
        await EmailContactModel.updateOne(
          { email },
          {
            $set: {
              orderCount: stat.totalOrders,
              paidOrderCount: stat.paidOrders,
              totalSpent: stat.totalSpent,
              ...(stat.lastPaidAt ? { lastPurchaseAt: stat.lastPaidAt } : {}),
              purchasedProductIds: Array.from(stat.productIds),
              categories,
              updatedAt: new Date().toISOString(),
            },
          }
        );
        synced++;
      }
    }

    for (const inq of inquiries) {
      const res = await this.upsertCollectedEmail({
        email: inq.email,
        fullName: inq.fullName,
        whatsApp: inq.whatsApp,
        source: 'contact_form',
        categories: ['New Emails'],
        collectedAt: inq.createdAt,
      });
      if (res) synced++;
    }

    return { synced };
  },

  async getCategoryCounts() {
    requireDatabaseConnection();
    const docs = await EmailContactModel.find().lean();
    const counts: Record<string, number> = {
      'All Contacts': docs.length,
      Affiliates: 0,
      'Newly Registered Affiliates': 0,
      'New Customers': 0,
      'Existing Customers': 0,
      'Repeat Customers': 0,
      'New Emails': 0,
      NeverPurchased: 0,
      Subscribed: 0,
      PendingConsent: 0,
      Unsubscribed: 0,
      Suppressed: 0,
    };

    for (const c of docs) {
      for (const cat of c.categories || []) {
        if (cat !== 'All Contacts') {
          counts[cat] = (counts[cat] || 0) + 1;
        }
      }
      if ((c.paidOrderCount || 0) === 0) counts.NeverPurchased++;
      if (c.marketingConsent === 'subscribed') counts.Subscribed++;
      else if (c.marketingConsent === 'pending') counts.PendingConsent++;
      else if (c.marketingConsent === 'unsubscribed') counts.Unsubscribed++;
      else if (c.marketingConsent === 'suppressed') counts.Suppressed++;
    }

    return counts;
  },

  async listContacts(filters?: {
    category?: string;
    search?: string;
    consent?: string;
    source?: string;
    segment?: string;
    productId?: string;
    inactiveDays?: number;
  }): Promise<EmailContact[]> {
    requireDatabaseConnection();
    const query: Record<string, unknown> = {};

    if (filters?.category && filters.category !== 'All Contacts' && filters.category !== 'all') {
      query.categories = filters.category;
    }

    if (filters?.consent && filters.consent !== 'all') {
      query.marketingConsent = filters.consent;
    }

    if (filters?.source && filters.source !== 'all') {
      query.source = filters.source;
    }

    if (filters?.productId) {
      query.purchasedProductIds = filters.productId;
    }

    if (filters?.segment === 'never_purchased') {
      query.paidOrderCount = 0;
    } else if (filters?.segment === 'newly_registered_affiliates') {
      query.categories = 'Newly Registered Affiliates';
    } else if (filters?.segment === 'not_purchased_recently') {
      const days = filters.inactiveDays || 30;
      const cutoff = new Date(Date.now() - days * 86_400_000).toISOString();
      query.$or = [
        { paidOrderCount: { $gt: 0 }, lastPurchaseAt: { $lte: cutoff } },
        { paidOrderCount: 0 },
      ];
    }

    const docs = await EmailContactModel.find(query).sort({ updatedAt: -1, createdAt: -1 }).lean();
    let results = docs.map(({ _id, ...rest }) => rest as EmailContact);

    if (filters?.search?.trim()) {
      const q = filters.search.trim().toLowerCase();
      results = results.filter(
        (c) =>
          c.email.toLowerCase().includes(q) ||
          (c.fullName || '').toLowerCase().includes(q) ||
          (c.whatsApp || '').toLowerCase().includes(q) ||
          (c.source || '').toLowerCase().includes(q)
      );
    }

    return results;
  },

  async addManualContact(input: {
    email: string;
    fullName?: string;
    whatsApp?: string;
    categories?: string[];
    marketingConsent?: MarketingConsentStatus;
    notes?: string;
  }): Promise<EmailContact> {
    requireDatabaseConnection();
    const cleanEmail = normalizeEmail(input.email);
    if (!isValidEmailFormat(cleanEmail)) {
      throw new ApiError(400, 'Please enter a valid email address.');
    }

    const contact = await this.upsertCollectedEmail({
      email: cleanEmail,
      fullName: input.fullName,
      whatsApp: input.whatsApp,
      source: 'manual',
      categories: input.categories?.length ? input.categories : ['New Emails'],
      explicitOptIn: input.marketingConsent === 'subscribed',
      consentSource: input.marketingConsent === 'subscribed' ? 'admin_confirmed_opt_in' : undefined,
      notes: input.notes,
    });

    if (!contact) throw new ApiError(500, 'Failed to save contact.');

    await auditService.addLog(
      'Manual Email Added',
      `Admin added/updated contact ${cleanEmail} (${(input.categories || ['New Emails']).join(', ')})`,
      'Admin'
    );

    return contact;
  },

  async bulkImportContacts(input: {
    rawText: string;
    source: 'csv_import' | 'paste_import';
    categories?: string[];
    hasPermissionToEmail?: boolean;
    importedBy?: string;
    fileName?: string;
  }): Promise<{
    totalParsed: number;
    imported: number;
    updated: number;
    skippedExisting: number;
    duplicatesSkipped: number;
    suppressedProtected: number;
    invalidEmails: string[];
    history?: EmailImportHistoryItem;
  }> {
    requireDatabaseConnection();
    const parsed = parseBulkEmailInput(input.rawText);
    const targetCategories = input.categories?.length ? input.categories : ['New Emails'];

    let imported = 0;
    let updated = 0;
    let suppressedProtected = 0;

    for (const item of parsed.valid) {
      const existing = await EmailContactModel.findOne({ email: item.email }).lean();
      if (
        existing &&
        input.hasPermissionToEmail &&
        (existing.marketingConsent === 'unsubscribed' || existing.marketingConsent === 'suppressed')
      ) {
        suppressedProtected++;
      }
      const res = await this.upsertCollectedEmail({
        email: item.email,
        fullName: item.fullName,
        whatsApp: item.whatsApp,
        notes: item.notes,
        source: input.source,
        categories: targetCategories,
        explicitOptIn: Boolean(input.hasPermissionToEmail),
        consentSource: input.hasPermissionToEmail ? `${input.source}_admin_confirmed` : undefined,
      });
      if (res) {
        if (existing) updated++;
        else imported++;
      }
    }

    const historyItem: EmailImportHistoryItem = {
      id: `imp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      fileName: input.fileName || (input.source === 'csv_import' ? 'uploaded.csv' : 'Manual Bulk Paste'),
      source: input.source,
      duplicateMode: 'update',
      categories: targetCategories,
      hasPermissionToEmail: Boolean(input.hasPermissionToEmail),
      totalRows: parsed.valid.length + parsed.invalid.length + parsed.duplicatesRemoved,
      imported,
      updated,
      skippedExisting: 0,
      duplicatesSkipped: parsed.duplicatesRemoved,
      suppressedProtected,
      invalidCount: parsed.invalid.length,
      invalidSample: parsed.invalid.slice(0, 15),
      importedBy: input.importedBy || 'Admin',
      createdAt: new Date().toISOString(),
    };
    await EmailImportHistoryModel.create(historyItem);

    await auditService.addLog(
      'Bulk Email Import',
      `Imported ${imported} new, updated ${updated} existing, skipped ${parsed.duplicatesRemoved} duplicates, protected ${suppressedProtected} opted-out/suppressed, ${parsed.invalid.length} invalid (${input.source})`,
      input.importedBy || 'Admin'
    );

    return {
      totalParsed: parsed.valid.length,
      imported,
      updated,
      skippedExisting: 0,
      duplicatesSkipped: parsed.duplicatesRemoved,
      suppressedProtected,
      invalidEmails: parsed.invalid.slice(0, 50),
      history: historyItem,
    };
  },

  async importMappedCsvContacts(input: {
    contacts: Array<{
      email?: string;
      firstName?: string;
      lastName?: string;
      fullName?: string;
      whatsApp?: string;
      notes?: string;
    }>;
    fileName?: string;
    duplicateMode?: 'skip' | 'update';
    categories?: string[];
    hasPermissionToEmail?: boolean;
    importedBy?: string;
  }): Promise<{
    totalParsed: number;
    imported: number;
    updated: number;
    skippedExisting: number;
    duplicatesSkipped: number;
    suppressedProtected: number;
    invalidEmails: string[];
    history: EmailImportHistoryItem;
  }> {
    requireDatabaseConnection();
    const duplicateMode: 'skip' | 'update' = input.duplicateMode === 'update' ? 'update' : 'skip';
    const targetCategories = input.categories?.length ? input.categories : ['New Emails'];
    const hasPermission = Boolean(input.hasPermissionToEmail);
    const now = new Date().toISOString();

    const seen = new Set<string>();
    const validRows: ParsedImportContact[] = [];
    const invalidEmails: string[] = [];
    let duplicatesSkipped = 0;

    for (const raw of input.contacts || []) {
      const cleanEmail = normalizeEmail(raw.email || '');
      if (!cleanEmail || !isValidEmailFormat(cleanEmail)) {
        if (raw.email && String(raw.email).trim()) {
          invalidEmails.push(String(raw.email).trim());
        } else {
          invalidEmails.push('(missing email)');
        }
        continue;
      }
      if (seen.has(cleanEmail)) {
        duplicatesSkipped++;
        continue;
      }
      seen.add(cleanEmail);

      const combinedName =
        (raw.fullName || '').trim() ||
        [raw.firstName || '', raw.lastName || ''].map((s) => s.trim()).filter(Boolean).join(' ');

      validRows.push({
        email: cleanEmail,
        fullName: combinedName,
        whatsApp: raw.whatsApp?.trim() || undefined,
        notes: raw.notes?.trim() || undefined,
      });
    }

    let imported = 0;
    let updated = 0;
    let skippedExisting = 0;
    let suppressedProtected = 0;

    for (const item of validRows) {
      const existing = await EmailContactModel.findOne({ email: item.email }).lean();
      if (existing) {
        if (
          existing.marketingConsent === 'unsubscribed' ||
          existing.marketingConsent === 'suppressed'
        ) {
          if (hasPermission) suppressedProtected++;
        }

        if (duplicateMode === 'skip') {
          skippedExisting++;
          continue;
        }

        // Update missing/contact details while NEVER reactivating unsubscribed/suppressed contacts
        const res = await this.upsertCollectedEmail({
          email: item.email,
          fullName: item.fullName,
          whatsApp: item.whatsApp,
          notes: item.notes,
          source: 'csv_import',
          categories: targetCategories,
          explicitOptIn: hasPermission,
          consentSource: hasPermission ? 'csv_import_admin_confirmed' : undefined,
        });
        if (res) updated++;
      } else {
        const res = await this.upsertCollectedEmail({
          email: item.email,
          fullName: item.fullName,
          whatsApp: item.whatsApp,
          notes: item.notes,
          source: 'csv_import',
          categories: targetCategories,
          explicitOptIn: hasPermission,
          consentSource: hasPermission ? 'csv_import_admin_confirmed' : undefined,
          collectedAt: now,
        });
        if (res) imported++;
      }
    }

    const historyItem: EmailImportHistoryItem = {
      id: `imp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      fileName: (input.fileName || 'contacts.csv').trim() || 'contacts.csv',
      source: 'csv_import',
      duplicateMode,
      categories: targetCategories,
      hasPermissionToEmail: hasPermission,
      totalRows: (input.contacts || []).length,
      imported,
      updated,
      skippedExisting,
      duplicatesSkipped,
      suppressedProtected,
      invalidCount: invalidEmails.length,
      invalidSample: invalidEmails.slice(0, 15),
      importedBy: input.importedBy || 'Admin',
      createdAt: now,
    };

    await EmailImportHistoryModel.create(historyItem);

    await auditService.addLog(
      'CSV Contacts Imported',
      `File "${historyItem.fileName}" (${duplicateMode}): ${imported} imported, ${updated} updated, ${skippedExisting} existing skipped, ${duplicatesSkipped} file dupes skipped, ${suppressedProtected} unsubscribed/suppressed protected, ${invalidEmails.length} invalid`,
      input.importedBy || 'Admin'
    );

    return {
      totalParsed: validRows.length,
      imported,
      updated,
      skippedExisting,
      duplicatesSkipped,
      suppressedProtected,
      invalidEmails: invalidEmails.slice(0, 50),
      history: historyItem,
    };
  },

  async listImportHistory(limit = 40): Promise<EmailImportHistoryItem[]> {
    requireDatabaseConnection();
    const docs = await EmailImportHistoryModel.find().sort({ createdAt: -1 }).limit(limit).lean();
    return docs.map(({ _id, ...rest }) => rest as EmailImportHistoryItem);
  },

  async updateContact(
    id: string,
    updates: {
      fullName?: string;
      whatsApp?: string;
      categories?: string[];
      marketingConsent?: MarketingConsentStatus;
      notes?: string;
    }
  ): Promise<EmailContact> {
    requireDatabaseConnection();
    const existing = await EmailContactModel.findOne({ id }).lean();
    if (!existing) throw new ApiError(404, 'Contact not found');

    const now = new Date().toISOString();
    const setFields: Record<string, unknown> = { updatedAt: now };

    if (typeof updates.fullName === 'string') setFields.fullName = updates.fullName.trim();
    if (typeof updates.whatsApp === 'string') setFields.whatsApp = updates.whatsApp.trim();
    if (typeof updates.notes === 'string') setFields.notes = updates.notes.trim();
    if (Array.isArray(updates.categories)) {
      const catSet = new Set<string>(['All Contacts', ...updates.categories.filter(Boolean)]);
      setFields.categories = Array.from(catSet);
    }
    if (updates.marketingConsent) {
      setFields.marketingConsent = updates.marketingConsent;
      if (updates.marketingConsent === 'unsubscribed') {
        setFields.unsubscribedAt = now;
      } else if (updates.marketingConsent === 'subscribed') {
        setFields.consentTimestamp = now;
        setFields.consentSource = 'admin_updated';
      } else if (updates.marketingConsent === 'suppressed') {
        setFields.suppressedAt = now;
      }
    }

    const updated = await EmailContactModel.findOneAndUpdate(
      { id },
      { $set: setFields },
      { new: true }
    ).lean();

    const { _id, ...rest } = updated!;
    return rest as EmailContact;
  },

  async deleteContact(id: string): Promise<boolean> {
    requireDatabaseConnection();
    const deleted = await EmailContactModel.findOneAndDelete({ id }).lean();
    return Boolean(deleted);
  },

  async exportContactsCsv(filters?: Parameters<typeof this.listContacts>[0]): Promise<string> {
    const contacts = await this.listContacts(filters);
    const escapeCsv = (val: string | number | undefined) => {
      const str = String(val ?? '');
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const headers = [
      'Email',
      'Full Name',
      'WhatsApp',
      'Categories',
      'Source',
      'Consent Status',
      'Paid Orders',
      'Total Spent (NGN)',
      'Last Purchase Date',
      'Collected At',
    ];

    const rows = contacts.map((c) =>
      [
        c.email,
        c.fullName,
        c.whatsApp || '',
        (c.categories || []).join(' | '),
        c.source,
        c.marketingConsent,
        c.paidOrderCount,
        c.totalSpent,
        c.lastPurchaseAt || '',
        c.collectedAt,
      ]
        .map(escapeCsv)
        .join(',')
    );

    return [headers.join(','), ...rows].join('\n');
  },

  async getByUnsubscribeToken(token: string): Promise<EmailContact | null> {
    requireDatabaseConnection();
    const doc = await EmailContactModel.findOne({ unsubscribeToken: token.trim() }).lean();
    if (!doc) return null;
    const { _id, ...rest } = doc;
    return rest as EmailContact;
  },

  async updatePreferencesByToken(
    token: string,
    payload: {
      action: 'unsubscribe' | 'resubscribe';
      reason?: string;
    }
  ): Promise<EmailContact> {
    requireDatabaseConnection();
    const existing = await EmailContactModel.findOne({ unsubscribeToken: token.trim() }).lean();
    if (!existing) {
      throw new ApiError(404, 'Email preference link is invalid or expired.');
    }

    const now = new Date().toISOString();
    const setFields: Record<string, unknown> = { updatedAt: now };

    if (payload.action === 'unsubscribe') {
      setFields.marketingConsent = 'unsubscribed';
      setFields.unsubscribedAt = now;
      if (payload.reason?.trim()) {
        setFields.unsubscribeReason = payload.reason.trim();
      }
    } else {
      if (existing.marketingConsent === 'suppressed') {
        throw new ApiError(
          400,
          'This email address was suppressed due to repeated delivery bounces. Contact support to reactivate.'
        );
      }
      setFields.marketingConsent = 'subscribed';
      setFields.consentSource = 'preference_center';
      setFields.consentTimestamp = now;
      setFields.unsubscribedAt = undefined;
    }

    const updated = await EmailContactModel.findOneAndUpdate(
      { unsubscribeToken: token.trim() },
      { $set: setFields },
      { new: true }
    ).lean();

    await auditService.addLog(
      payload.action === 'unsubscribe' ? 'Email Unsubscribed' : 'Email Resubscribed',
      `${existing.email} updated marketing preference to ${payload.action}${
        payload.reason ? ` (${payload.reason})` : ''
      }`,
      existing.email
    );

    const { _id, ...rest } = updated!;
    return rest as EmailContact;
  },

  async recordBounce(email: string, reason: string): Promise<void> {
    requireDatabaseConnection();
    const cleanEmail = normalizeEmail(email);
    if (!cleanEmail) return;

    const existing = await EmailContactModel.findOneAndUpdate(
      { email: cleanEmail },
      {
        $inc: { bounceCount: 1 },
        $set: {
          lastBounceReason: reason.slice(0, 400),
          updatedAt: new Date().toISOString(),
        },
      },
      { new: true }
    ).lean();

    if (existing && (existing.bounceCount || 0) >= 2 && existing.marketingConsent !== 'suppressed') {
      await EmailContactModel.updateOne(
        { email: cleanEmail },
        {
          $set: {
            marketingConsent: 'suppressed',
            suppressedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        }
      );
      await auditService.addLog(
        'Email Auto-Suppressed',
        `Automatically suppressed ${cleanEmail} after ${existing.bounceCount} delivery bounces (${reason})`,
        'Email Compliance Engine'
      );
    }
  },
};
