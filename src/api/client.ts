import {
  Product,
  Order,
  CustomerReview,
  SiteSettings,
  FAQItem,
  LegalPolicies,
  HeroSlide,
  BenefitCard,
  ContactMessage,
  InquiryStatus,
  AuditLog,
  Affiliate,
  AffiliateCommission,
  AffiliateWithdrawal,
  AffiliateLedgerEntry,
  ReferralAttribution,
  SystemUser,
  UserRole,
  UserStatus,
  EmailContact,
  EmailBrandingConfig,
  EmailImportHistoryItem,
  MarketingConsentStatus,
  EmailCampaign,
  EmailSendLog,
  DailyAutomationConfig,
  DayOfWeekKey,
  CampaignTargetType,
  DigitalAsset,
  ProductDeliveryRecord,
  DestinationType,
  PostPaymentConfig,
  ProductDeliveryConfig,
} from '../types';

export interface EmailProviderDiagnostics {
  configured: boolean;
  activeProvider: 'brevo' | 'brevo-smtp' | 'smtp' | 'none';
  providerLabel: string;
  sender: {
    name: string;
    email: string;
    explicit: boolean;
  };
  smtp: {
    configured: boolean;
    host: string | null;
    port: number;
    secure: boolean;
    hasAuth: boolean;
    isBrevoRelay: boolean;
  };
  envVars: {
    BREVO_API_KEY: boolean;
    BREVO_SENDER_EMAIL: boolean;
    BREVO_SENDER_NAME: boolean;
    CONTACT_EMAIL: boolean;
    SMTP_HOST: boolean;
    SMTP_PORT: boolean;
    SMTP_SECURE: boolean;
    SMTP_USER: boolean;
    SMTP_PASS: boolean;
    EMAIL_FROM: boolean;
  };
  endpoints: {
    brevoRestApi: string;
    brevoSendersApi: string;
    statusApi: string;
    verifyApi: string;
    testEmailApi: string;
  };
  liveCheck?: {
    checkedAt: string;
    brevoApiOk?: boolean;
    brevoError?: string;
    verifiedSenders?: Array<{ email: string; active: boolean; name?: string }>;
    smtpOk?: boolean;
    smtpError?: string;
  };
}

const resolveApiBase = (): string => {
  const raw = (
    (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_API_BASE_URL || ''
  ).trim();
  if (!raw) return '';

  const normalized = raw.replace(/\/+$/, '').replace(/\/api$/i, '');

  if (typeof window !== 'undefined') {
    const { hostname, port } = window.location;
    const isPageLocal = hostname === 'localhost' || hostname === '127.0.0.1';
    const isTargetLocal = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(normalized);
    const isStandaloneVitePort = port === '5173' || port === '5174';

    // When served by full-stack Express+Vite on port 3000 or Cloud Run (*.run.app),
    // ignore localhost:5000 overrides and always use same-origin relative /api/* paths.
    if (isTargetLocal && (!isPageLocal || !isStandaloneVitePort)) {
      return '';
    }
  }

  return normalized;
};

const API_BASE = resolveApiBase();

const apiUrl = (path: string) => `${API_BASE}${path}`;

const apiFetch = async (input: string, init?: RequestInit): Promise<Response> => {
  const res = await globalThis.fetch(input, init);
  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    const rawText = await res.clone().text().catch(() => '');
    const safeJson = async () => {
      if (!rawText) {
        return { error: res.ok ? undefined : `Server error (${res.status})` };
      }
      try {
        return JSON.parse(rawText);
      } catch {
        return {
          error: res.ok
            ? 'Unexpected response format from server'
            : rawText.slice(0, 160) || `Server error (${res.status})`,
        };
      }
    };
    return Object.assign(res, { json: safeJson });
  }
  return res;
};

export interface BootstrapResponse {
  products: Product[];
  allProducts: Product[];
  categories: string[];
  heroSlides: HeroSlide[];
  benefitCards: BenefitCard[];
  reviews: CustomerReview[];
  settings: SiteSettings;
  faqs: FAQItem[];
  policies: LegalPolicies;
}

export const api = {
  // Health
  async getHealth() {
    const res = await apiFetch(apiUrl('/api/health'));
    return res.json();
  },

  // Public
  async getBootstrap(): Promise<BootstrapResponse> {
    let res = await apiFetch(apiUrl('/api/bootstrap'));
    if (res.status === 503) {
      await new Promise((r) => setTimeout(r, 1500));
      res = await apiFetch(apiUrl('/api/bootstrap'));
    }
    const json = await res.json();
    if (!res.ok) throw new Error(json?.error || `Failed to load store data (${res.status})`);
    return json.data;
  },

  async getProducts(category?: string, search?: string): Promise<Product[]> {
    const params = new URLSearchParams();
    if (category) params.append('category', category);
    if (search) params.append('search', search);
    const res = await apiFetch(apiUrl(`/api/products?${params.toString()}`));
    if (!res.ok) throw new Error('Failed to load products');
    const json = await res.json();
    return json.products;
  },

  async getProduct(id: string): Promise<Product> {
    const res = await apiFetch(apiUrl(`/api/products/${encodeURIComponent(id)}`));
    if (!res.ok) throw new Error('Failed to load product');
    const json = await res.json();
    return json.product;
  },

  async createOrder(data: {
    customerName: string;
    customerEmail: string;
    customerWhatsApp: string;
    items: Array<{ productId: string; quantity: number }>;
    paymentMethod: Order['paymentMethod'];
    proofNote?: string;
    referralCode?: string;
    marketingConsent?: boolean;
  }): Promise<Order> {
    const res = await apiFetch(apiUrl('/api/orders'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to create order');
    return json.order;
  },

  async getOrder(orderId: string): Promise<Order> {
    const res = await apiFetch(apiUrl(`/api/orders/${encodeURIComponent(orderId)}`));
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Order not found');
    return json.order;
  },

  async lookupOrders(query: string): Promise<Order[]> {
    const res = await apiFetch(apiUrl('/api/orders/lookup'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Lookup failed');
    return json.orders;
  },

  async submitManualPayment(
    orderId: string,
    data: {
      paymentMethod: string;
      transactionReference?: string;
      transactionHash?: string;
      proofNote?: string;
    }
  ): Promise<{ order: Order; whatsappUrl: string; whatsappMessage: string }> {
    const res = await apiFetch(apiUrl(`/api/orders/${encodeURIComponent(orderId)}/manual-payment`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to submit payment notification');
    return json;
  },

  async initializePaystack(orderId: string): Promise<{
    status: boolean;
    authorizationUrl: string;
    accessCode: string;
    reference: string;
    mode: string;
    note?: string;
  }> {
    const res = await apiFetch(apiUrl('/api/paystack/initialize'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId }),
    });
    const json = await res.json();
    if (!res.ok || !json.status) throw new Error(json.error || json.message || 'Payment initialization failed');
    return json;
  },

  async verifyPaystack(reference: string): Promise<{
    status: boolean;
    order?: Order;
    alreadyProcessed?: boolean;
    channel?: string;
    message?: string;
  }> {
    const res = await apiFetch(apiUrl(`/api/paystack/verify/${encodeURIComponent(reference)}`));
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Verification check failed');
    return json;
  },

  async submitContact(data: {
    fullName: string;
    email: string;
    whatsApp?: string;
    subject: string;
    message: string;
    marketingConsent?: boolean;
  }): Promise<{ success: boolean; message: string; inquiryId?: string; emailSent?: boolean }> {
    const res = await apiFetch(apiUrl('/api/contact'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to send message');
    return json;
  },

  async submitReview(data: {
    customerName: string;
    rating: number;
    reviewMessage: string;
    productPurchased?: string;
    orderId?: string;
  }): Promise<{ success: boolean; message: string }> {
    const res = await apiFetch(apiUrl('/api/reviews'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to submit review');
    return json;
  },

  // Unified Authentication (/api/auth)
  async authRegister(data: {
    fullName: string;
    email: string;
    phone?: string;
    password: string;
    role?: 'affiliate' | 'user';
    bankName?: string;
    accountNumber?: string;
    accountName?: string;
    marketingConsent?: boolean;
  }): Promise<{
    success: boolean;
    token: string;
    user: SystemUser;
    affiliate: Affiliate | null;
    message?: string;
  }> {
    const res = await apiFetch(apiUrl('/api/auth/register'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Registration failed');
    return json;
  },

  async authLogin(
    password: string,
    email?: string
  ): Promise<{
    success: boolean;
    token: string;
    user: SystemUser;
    affiliate: Affiliate | null;
  }> {
    const res = await apiFetch(apiUrl('/api/auth/login'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...(email && email.trim() ? { email: email.trim().toLowerCase() } : {}),
        password,
      }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Login failed');
    return json;
  },

  async authMe(token: string): Promise<{
    success: boolean;
    user: SystemUser;
    affiliate: Affiliate | null;
  }> {
    const res = await apiFetch(apiUrl('/api/auth/me'), {
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Session expired');
    return json;
  },

  async becomeAffiliate(
    token: string,
    data: {
      phone?: string;
      bankName: string;
      accountNumber: string;
      accountName: string;
    }
  ): Promise<{
    success: boolean;
    token: string;
    user: SystemUser;
    affiliate: Affiliate;
  }> {
    const res = await apiFetch(apiUrl('/api/auth/become-affiliate'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to activate affiliate profile');
    return json;
  },

  // Affiliates
  async registerAffiliate(data: {
    fullName: string;
    email: string;
    phone: string;
    password?: string;
    bankName: string;
    accountNumber: string;
    accountName: string;
    marketingConsent?: boolean;
  }): Promise<{ success: boolean; affiliate: Affiliate; user?: SystemUser; token: string }> {
    const res = await apiFetch(apiUrl('/api/affiliates/register'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Affiliate registration failed');
    return json;
  },

  async loginAffiliate(
    email: string,
    password: string
  ): Promise<{ affiliate: Affiliate; user?: SystemUser; token: string }> {
    const res = await apiFetch(apiUrl('/api/affiliates/login'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Affiliate login failed');
    return json;
  },

  async trackReferralClick(referralCode: string, targetPath?: string): Promise<void> {
    await apiFetch(apiUrl('/api/affiliates/track-click'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ referralCode, targetPath }),
    });
  },

  async getAffiliateDashboard(token: string): Promise<{
    affiliate: Affiliate;
    commissions: AffiliateCommission[];
    withdrawals: AffiliateWithdrawal[];
    ledger: AffiliateLedgerEntry[];
    referredCustomers: ReferralAttribution[];
  }> {
    const res = await apiFetch(apiUrl('/api/affiliates/me'), {
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to load affiliate dashboard');
    return json;
  },

  async requestAffiliateWithdrawal(token: string, amount: number): Promise<AffiliateWithdrawal> {
    const res = await apiFetch(apiUrl('/api/affiliates/withdrawals'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ amount }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to submit withdrawal request');
    return json.withdrawal;
  },

  // Admin
  async getAdminDashboard(token: string) {
    const res = await apiFetch(apiUrl('/api/admin/dashboard'), {
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to load dashboard');
    return json;
  },

  async getAdminOrders(token: string, status?: string): Promise<Order[]> {
    const url = status ? `/api/admin/orders?status=${encodeURIComponent(status)}` : '/api/admin/orders';
    const res = await apiFetch(apiUrl(url), {
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to load orders');
    return json.orders;
  },

  async updateAdminOrder(token: string, orderId: string, updates: Partial<Order>): Promise<Order> {
    const res = await apiFetch(apiUrl(`/api/admin/orders/${encodeURIComponent(orderId)}`), {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(updates),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to update order');
    return json.order;
  },

  async createProduct(token: string, product: Omit<Product, 'id'>): Promise<Product> {
    const res = await apiFetch(apiUrl('/api/admin/products'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(product),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to create product');
    return json.product;
  },

  async updateProduct(
    token: string,
    id: string,
    product: Partial<Omit<Product, 'commissionRateOverride' | 'usdPrice'>> & {
      commissionRateOverride?: number | null;
      usdPrice?: number | null;
    }
  ): Promise<Product> {
    const res = await apiFetch(apiUrl(`/api/admin/products/${encodeURIComponent(id)}`), {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(product),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to update product');
    return json.product;
  },

  async deleteProduct(token: string, id: string): Promise<boolean> {
    const res = await apiFetch(apiUrl(`/api/admin/products/${encodeURIComponent(id)}`), {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to delete product');
    return json.success;
  },

  async updateSettings(token: string, settings: Partial<SiteSettings>): Promise<SiteSettings> {
    const res = await apiFetch(apiUrl('/api/admin/settings'), {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(settings),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to update settings');
    return json.settings;
  },

  async updateExchangeRate(
    token: string,
    usdNgnRate: number,
    syncUsdtRate = false
  ): Promise<{ settings: SiteSettings; updatedProductsCount: number }> {
    const res = await apiFetch(apiUrl('/api/admin/exchange-rate'), {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ usdNgnRate, syncUsdtRate }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to update dollar exchange rate');
    return json;
  },

  async updateCMS(token: string, section: string, data: Record<string, unknown>) {
    const res = await apiFetch(apiUrl(`/api/admin/cms/${encodeURIComponent(section)}`), {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || `Failed to update ${section}`);
    return json;
  },

  async resetHeroSlides(token: string): Promise<HeroSlide[]> {
    const res = await apiFetch(apiUrl('/api/admin/cms/reset-slides'), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to reset hero slides');
    return json.slides;
  },

  async getAdminReviews(token: string): Promise<CustomerReview[]> {
    const res = await apiFetch(apiUrl('/api/admin/reviews'), {
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to load reviews');
    return json.reviews;
  },

  async updateReview(token: string, id: string, updates: Partial<CustomerReview>): Promise<CustomerReview> {
    const res = await apiFetch(apiUrl(`/api/admin/reviews/${encodeURIComponent(id)}`), {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(updates),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to update review');
    return json.review;
  },

  async deleteReview(token: string, id: string): Promise<boolean> {
    const res = await apiFetch(apiUrl(`/api/admin/reviews/${encodeURIComponent(id)}`), {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to delete review');
    return json.success;
  },

  async getAdminInquiries(token: string): Promise<ContactMessage[]> {
    const res = await apiFetch(apiUrl('/api/admin/inquiries'), {
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to load inquiries');
    return json.inquiries;
  },

  async markInquiryRead(token: string, id: string): Promise<boolean> {
    const res = await apiFetch(apiUrl(`/api/admin/inquiries/${encodeURIComponent(id)}/read`), {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to mark inquiry as read');
    return json.success;
  },

  async replyToInquiry(
    token: string,
    id: string,
    payload: { subject: string; message: string; status?: InquiryStatus }
  ): Promise<{
    inquiry: ContactMessage;
    sendResult: { success: boolean; sent: boolean; provider: string; error?: string; messageId?: string };
  }> {
    const res = await apiFetch(apiUrl(`/api/admin/inquiries/${encodeURIComponent(id)}/reply`), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to send inquiry reply');
    return json;
  },

  async updateInquiryStatus(
    token: string,
    id: string,
    status: InquiryStatus
  ): Promise<ContactMessage> {
    const res = await apiFetch(apiUrl(`/api/admin/inquiries/${encodeURIComponent(id)}/status`), {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ status }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to update inquiry status');
    return json.inquiry;
  },

  async getAuditLogs(token: string): Promise<AuditLog[]> {
    const res = await apiFetch(apiUrl('/api/admin/audit-logs'), {
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to load audit logs');
    return json.auditLogs;
  },

  async uploadImage(
    token: string,
    imageBase64: string,
    fileName?: string
  ): Promise<{ success: boolean; url: string; publicId?: string; fileName: string; sizeBytes: number }> {
    const res = await apiFetch(apiUrl('/api/admin/upload-image'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ imageBase64, fileName }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to upload image to Cloudinary');
    return json;
  },

  async uploadProductImage(
    token: string,
    productId: string,
    imageBase64: string,
    fileName?: string
  ): Promise<{ success: boolean; url: string; product: Product; publicId?: string; fileName: string; sizeBytes: number }> {
    const res = await apiFetch(apiUrl(`/api/admin/products/${encodeURIComponent(productId)}/image`), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ imageBase64, fileName }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to upload product image to Cloudinary');
    return json;
  },

  async getAdminAffiliates(token: string): Promise<Affiliate[]> {
    const res = await apiFetch(apiUrl('/api/admin/affiliates'), {
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to load affiliates');
    return json.affiliates;
  },

  async getAdminReferredCustomers(token: string): Promise<ReferralAttribution[]> {
    const res = await apiFetch(apiUrl('/api/admin/referred-customers'), {
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to load referred customers');
    return json.referredCustomers || [];
  },

  async getAdminWithdrawals(token: string): Promise<AffiliateWithdrawal[]> {
    const res = await apiFetch(apiUrl('/api/admin/withdrawals'), {
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to load withdrawals');
    return json.withdrawals;
  },

  async updateAdminWithdrawal(
    token: string,
    withdrawalId: string,
    data: {
      status: AffiliateWithdrawal['status'];
      transferReference?: string;
      rejectionReason?: string;
      adminNotes?: string;
    }
  ): Promise<AffiliateWithdrawal> {
    const res = await apiFetch(apiUrl(`/api/admin/withdrawals/${encodeURIComponent(withdrawalId)}`), {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to update withdrawal');
    return json.withdrawal;
  },

  async getAdminUsers(token: string, filters?: { role?: string; status?: string }): Promise<SystemUser[]> {
    const params = new URLSearchParams();
    if (filters?.role && filters.role !== 'all') params.append('role', filters.role);
    if (filters?.status && filters.status !== 'all') params.append('status', filters.status);
    const qs = params.toString();
    const res = await apiFetch(apiUrl(`/api/admin/users${qs ? `?${qs}` : ''}`), {
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to load user accounts');
    return json.users || json.admins || [];
  },

  async registerAdminUser(
    token: string,
    data: {
      fullName?: string;
      name?: string;
      email: string;
      phone?: string;
      password: string;
      role: UserRole;
      status?: UserStatus;
      isVerified: boolean;
    }
  ): Promise<SystemUser> {
    const res = await apiFetch(apiUrl('/api/admin/users'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to register user account');
    return json.user || json.admin;
  },

  async updateAdminUser(
    token: string,
    id: string,
    updates: Partial<
      Pick<SystemUser, 'fullName' | 'name' | 'phone' | 'role' | 'status' | 'isVerified' | 'isActive'>
    > & { password?: string }
  ): Promise<SystemUser> {
    const res = await apiFetch(apiUrl(`/api/admin/users/${encodeURIComponent(id)}`), {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(updates),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to update user account');
    return json.user || json.admin;
  },

  async deleteAdminUser(token: string, id: string): Promise<boolean> {
    const res = await apiFetch(apiUrl(`/api/admin/users/${encodeURIComponent(id)}`), {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to delete user account');
    return json.success;
  },

  // --- Public Email Preferences & Unsubscribe ---
  async getEmailPreferences(token: string): Promise<{
    email: string;
    fullName: string;
    marketingConsent: MarketingConsentStatus;
    unsubscribedAt?: string;
    consentTimestamp?: string;
  }> {
    const res = await apiFetch(apiUrl(`/api/email/preferences/${encodeURIComponent(token)}`));
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Preference link not found');
    return json.contact;
  },

  async updateEmailPreferences(
    token: string,
    payload: { action: 'unsubscribe' | 'resubscribe'; reason?: string }
  ) {
    const res = await apiFetch(apiUrl(`/api/email/preferences/${encodeURIComponent(token)}`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to update preferences');
    return json;
  },

  // --- Public Post-Payment Order Delivery ---
  async getOrderDeliveryBundle(
    orderId: string,
    verification?: { token?: string; email?: string }
  ): Promise<{
    paid: boolean;
    order: Pick<
      Order,
      'id' | 'customerName' | 'totalAmount' | 'paymentStatus' | 'fulfillmentStatus' | 'paymentMethod' | 'createdAt' | 'verifiedAt'
    >;
    headline: string;
    instructions: string;
    primaryDestination?: {
      type: DestinationType;
      url: string;
      whatsappMessage?: string;
    };
    items: Array<{
      productId: string;
      productName: string;
      duration: string;
      destinationType: DestinationType;
      destinationUrl: string;
      whatsappMessage?: string;
      digitalAssetId?: string;
      digitalFileName?: string;
      digitalMimeType?: string;
      digitalFileSize?: number;
      downloadToken: string;
      downloadEnabled: boolean;
      downloadCount: number;
      deliveryStatus: ProductDeliveryRecord['deliveryStatus'];
    }>;
  }> {
    const qs = new URLSearchParams();
    if (verification?.token) qs.set('token', verification.token);
    if (verification?.email) qs.set('email', verification.email);
    const res = await apiFetch(
      apiUrl(`/api/delivery/order/${encodeURIComponent(orderId)}${qs.toString() ? `?${qs.toString()}` : ''}`)
    );
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to load order delivery access');
    return json;
  },

  // --- Admin Email Marketing & CRM ---
  async getEmailOverview(
    token: string,
    filters?: { from?: string; to?: string }
  ): Promise<{
    kpis: {
      totalContacts: number;
      affiliatesCount: number;
      newlyRegisteredAffiliatesCount: number;
      newCustomersCount: number;
      existingCustomersCount: number;
      repeatCustomersCount: number;
      newEmailsCount: number;
      subscribedCount: number;
      pendingConsentCount: number;
      unsubscribedCount: number;
      suppressedCount: number;
      campaignsSent: number;
      totalCampaigns: number;
      totalEmailsSent: number;
      deliveredCount: number;
      failedCount: number;
      bouncedCount: number;
      openCount: number;
      clickCount: number;
      openRate: number;
      clickThroughRate: number;
      unsubscribeRate: number;
    };
    providerStatus?: EmailProviderDiagnostics;
    categoryCounts: Record<string, number>;
    campaigns: EmailCampaign[];
    recentLogs: EmailSendLog[];
    dailyAutomationSummary: {
      enabled: boolean;
      sendTime: string;
      timezone: string;
      enabledDays: number;
    };
    brevoRecentEvents: Array<{ event?: string; email?: string; reason?: string; date?: string; subject?: string }>;
    trackingNote: string;
  }> {
    const qs = new URLSearchParams();
    if (filters?.from) qs.set('from', filters.from);
    if (filters?.to) qs.set('to', filters.to);
    const res = await apiFetch(
      apiUrl(`/api/admin/email/overview${qs.toString() ? `?${qs.toString()}` : ''}`),
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to load email overview');
    return json;
  },

  async getEmailProviderStatus(
    token: string,
    verify = false
  ): Promise<EmailProviderDiagnostics> {
    const res = await apiFetch(
      apiUrl(`/api/admin/email/provider-status${verify ? '?verify=true' : ''}`),
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to check SMTP / Brevo provider status');
    return json.providerStatus;
  },

  async getEmailContacts(
    token: string,
    filters?: {
      category?: string;
      search?: string;
      consent?: string;
      source?: string;
      segment?: string;
      productId?: string;
      inactiveDays?: number;
    }
  ): Promise<{ contacts: EmailContact[]; counts: Record<string, number> }> {
    const qs = new URLSearchParams();
    if (filters?.category) qs.set('category', filters.category);
    if (filters?.search) qs.set('search', filters.search);
    if (filters?.consent) qs.set('consent', filters.consent);
    if (filters?.source) qs.set('source', filters.source);
    if (filters?.segment) qs.set('segment', filters.segment);
    if (filters?.productId) qs.set('productId', filters.productId);
    if (filters?.inactiveDays) qs.set('inactiveDays', String(filters.inactiveDays));
    const res = await apiFetch(
      apiUrl(`/api/admin/email/contacts${qs.toString() ? `?${qs.toString()}` : ''}`),
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to load email contacts');
    return json;
  },

  async syncEmailContacts(token: string): Promise<{ synced: number; message: string; counts: Record<string, number> }> {
    const res = await apiFetch(apiUrl('/api/admin/email/contacts/sync'), {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to sync contacts');
    return json;
  },

  async addManualEmailContact(
    token: string,
    data: {
      email: string;
      fullName?: string;
      whatsApp?: string;
      categories?: string[];
      marketingConsent?: MarketingConsentStatus;
      notes?: string;
    }
  ): Promise<EmailContact> {
    const res = await apiFetch(apiUrl('/api/admin/email/contacts'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to add contact');
    return json.contact;
  },

  async bulkImportEmailContacts(
    token: string,
    data: {
      rawText: string;
      source: 'csv_import' | 'paste_import';
      categories?: string[];
      hasPermissionToEmail?: boolean;
      fileName?: string;
    }
  ): Promise<{
    totalParsed: number;
    imported: number;
    updated: number;
    skippedExisting?: number;
    duplicatesSkipped: number;
    suppressedProtected?: number;
    invalidEmails: string[];
    history?: EmailImportHistoryItem;
  }> {
    const res = await apiFetch(apiUrl('/api/admin/email/contacts/import'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to import contacts');
    return json;
  },

  async importMappedCsvContacts(
    token: string,
    data: {
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
    }
  ): Promise<{
    totalParsed: number;
    imported: number;
    updated: number;
    skippedExisting: number;
    duplicatesSkipped: number;
    suppressedProtected: number;
    invalidEmails: string[];
    history: EmailImportHistoryItem;
  }> {
    const res = await apiFetch(apiUrl('/api/admin/email/contacts/import-csv'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'CSV import failed');
    return json;
  },

  async getEmailImportHistory(token: string): Promise<EmailImportHistoryItem[]> {
    const res = await apiFetch(apiUrl('/api/admin/email/imports'), {
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to load CSV import history');
    return json.history;
  },

  async updateEmailContact(
    token: string,
    id: string,
    updates: {
      fullName?: string;
      whatsApp?: string;
      categories?: string[];
      marketingConsent?: MarketingConsentStatus;
      notes?: string;
    }
  ): Promise<EmailContact> {
    const res = await apiFetch(apiUrl(`/api/admin/email/contacts/${encodeURIComponent(id)}`), {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(updates),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to update contact');
    return json.contact;
  },

  async deleteEmailContact(token: string, id: string): Promise<boolean> {
    const res = await apiFetch(apiUrl(`/api/admin/email/contacts/${encodeURIComponent(id)}`), {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to delete contact');
    return json.success;
  },

  async estimateCampaignAudience(
    token: string,
    params: {
      targetType: CampaignTargetType;
      targetCategories?: string[];
      targetProductIds?: string[];
      inactiveDays?: number;
      neverPurchasedOnly?: boolean;
      targetEmails?: string[];
    }
  ): Promise<{
    eligibleCount: number;
    pendingExcludedCount: number;
    sampleRecipients: Array<{ email: string; fullName: string }>;
  }> {
    const res = await apiFetch(apiUrl('/api/admin/email/campaigns/estimate'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(params),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to estimate audience');
    return json;
  },

  async getEmailCampaigns(token: string): Promise<EmailCampaign[]> {
    const res = await apiFetch(apiUrl('/api/admin/email/campaigns'), {
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to load campaigns');
    return json.campaigns;
  },

  async saveEmailCampaign(
    token: string,
    data: {
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
    }
  ): Promise<EmailCampaign> {
    const res = await apiFetch(apiUrl('/api/admin/email/campaigns'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to save campaign');
    return json.campaign;
  },

  async emailCampaignAction(
    token: string,
    id: string,
    action: 'pause' | 'resume' | 'cancel' | 'send_now' | 'delete'
  ): Promise<EmailCampaign | null> {
    const res = await apiFetch(apiUrl(`/api/admin/email/campaigns/${encodeURIComponent(id)}`), {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ action }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to update campaign');
    return json.campaign;
  },

  async previewBrandedEmail(
    token: string,
    data: {
      subject: string;
      greeting?: string;
      bodyHtml: string;
      imageUrl?: string;
      ctaLabel?: string;
      ctaUrl?: string;
      preheader?: string;
      sampleName?: string;
    }
  ): Promise<{ subject: string; html: string; text: string }> {
    const res = await apiFetch(apiUrl('/api/admin/email/preview'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to render preview');
    return json.preview;
  },

  async sendTestBrandedEmail(
    token: string,
    data: {
      to: string;
      subject: string;
      greeting?: string;
      bodyHtml: string;
      imageUrl?: string;
      ctaLabel?: string;
      ctaUrl?: string;
      preheader?: string;
      sampleName?: string;
    }
  ) {
    const res = await apiFetch(apiUrl('/api/admin/email/test'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Test email failed');
    return json.result;
  },

  async getDailyEmailAutomation(token: string): Promise<DailyAutomationConfig> {
    const res = await apiFetch(apiUrl('/api/admin/email/daily-automation'), {
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to load daily automation');
    return json.config;
  },

  async updateDailyEmailAutomation(
    token: string,
    config: Partial<DailyAutomationConfig>
  ): Promise<DailyAutomationConfig> {
    const res = await apiFetch(apiUrl('/api/admin/email/daily-automation'), {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(config),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to update daily automation');
    return json.config;
  },

  async runDailyEmailAutomationNow(token: string, dayKey?: DayOfWeekKey) {
    const res = await apiFetch(apiUrl('/api/admin/email/daily-automation/run'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ dayKey }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to trigger daily email run');
    return json;
  },

  async getMarketingCalendar(
    token: string,
    month?: string
  ): Promise<{
    month: string;
    events: Array<{
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
    }>;
    conflicts: Array<{ date: string; message: string }>;
    dailyAutomation: DailyAutomationConfig;
  }> {
    const qs = month ? `?month=${encodeURIComponent(month)}` : '';
    const res = await apiFetch(apiUrl(`/api/admin/email/calendar${qs}`), {
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to load calendar');
    return json;
  },

  async downloadAdminCsv(token: string, path: string, fileName: string) {
    const res = await apiFetch(apiUrl(path), {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('CSV export failed');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },

  // --- Admin Digital Assets & Post-Payment Delivery ---
  async getDigitalAssets(token: string): Promise<DigitalAsset[]> {
    const res = await apiFetch(apiUrl('/api/admin/delivery/assets'), {
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to load digital assets');
    return json.assets;
  },

  async uploadDigitalAsset(token: string, file: File, title?: string): Promise<DigitalAsset> {
    const formData = new FormData();
    formData.append('file', file);
    if (title?.trim()) formData.append('title', title.trim());

    const res = await apiFetch(apiUrl('/api/admin/delivery/assets'), {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Digital file upload failed');
    return json.asset;
  },

  async deleteDigitalAsset(token: string, id: string): Promise<boolean> {
    const res = await apiFetch(apiUrl(`/api/admin/delivery/assets/${encodeURIComponent(id)}`), {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to delete digital asset');
    return json.success;
  },

  async previewDeliveryDestination(
    token: string,
    payload: {
      productId?: string;
      overridePostPaymentConfig?: Partial<PostPaymentConfig>;
      overrideProductConfig?: ProductDeliveryConfig;
    }
  ): Promise<{
    destinationType: DestinationType;
    destinationUrl: string;
    whatsappMessage?: string;
    digitalAssetId?: string;
    digitalFileName?: string;
  }> {
    const res = await apiFetch(apiUrl('/api/admin/delivery/preview'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to preview destination');
    return json.preview;
  },

  async getDeliveryRecords(
    token: string,
    filters?: { search?: string; status?: string; destinationType?: string; productId?: string }
  ): Promise<ProductDeliveryRecord[]> {
    const qs = new URLSearchParams();
    if (filters?.search) qs.set('search', filters.search);
    if (filters?.status) qs.set('status', filters.status);
    if (filters?.destinationType) qs.set('destinationType', filters.destinationType);
    if (filters?.productId) qs.set('productId', filters.productId);
    const res = await apiFetch(
      apiUrl(`/api/admin/delivery/records${qs.toString() ? `?${qs.toString()}` : ''}`),
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to load delivery records');
    return json.records;
  },

  async toggleDeliveryAccess(
    token: string,
    recordId: string,
    enabled: boolean
  ): Promise<ProductDeliveryRecord> {
    const res = await apiFetch(
      apiUrl(`/api/admin/delivery/records/${encodeURIComponent(recordId)}/toggle`),
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ enabled }),
      }
    );
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to toggle delivery access');
    return json.record;
  },

  async resendDeliveryInstructions(token: string, recordId: string) {
    const res = await apiFetch(
      apiUrl(`/api/admin/delivery/records/${encodeURIComponent(recordId)}/resend`),
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to resend delivery email');
    return json;
  },

  async getDeliveryReports(token: string): Promise<{
    summary: {
      totalRecords: number;
      paidRecords: number;
      pendingAccess: number;
      accessedOrDownloaded: number;
      totalDownloads: number;
      revokedCount: number;
      completionRate: number;
    };
    byProduct: Array<{
      productId: string;
      productName: string;
      paidOrders: number;
      accessedCount: number;
      totalDownloads: number;
      destinationType: DestinationType;
    }>;
  }> {
    const res = await apiFetch(apiUrl('/api/admin/delivery/reports'), {
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to load delivery reports');
    return json;
  },

  // --- Admin Purchase Thank-You Email ---
  async previewThankYouEmail(
    token: string,
    data: {
      customerName?: string;
      orderId?: string;
      brandingOverride?: Partial<EmailBrandingConfig>;
      whatsappCommunityUrl?: string;
      telegramChannelUrl?: string;
    }
  ): Promise<{ subject: string; html: string; text: string; enabled: boolean }> {
    const res = await apiFetch(apiUrl('/api/admin/email/thank-you/preview'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to preview thank-you email');
    return json.preview;
  },

  async sendTestThankYouEmail(
    token: string,
    data: {
      to: string;
      brandingOverride?: Partial<EmailBrandingConfig>;
      whatsappCommunityUrl?: string;
      telegramChannelUrl?: string;
    }
  ) {
    const res = await apiFetch(apiUrl('/api/admin/email/thank-you/test'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to send test thank-you email');
    return json.result;
  },

  async getThankYouHistory(token: string): Promise<EmailSendLog[]> {
    const res = await apiFetch(apiUrl('/api/admin/email/thank-you/history'), {
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to load thank-you email history');
    return json.logs;
  },

  async retryThankYouEmail(token: string, logId: string): Promise<{ sent: boolean; log?: EmailSendLog; error?: string }> {
    const res = await apiFetch(apiUrl(`/api/admin/email/thank-you/retry/${encodeURIComponent(logId)}`), {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Retry failed');
    return json;
  },
};


