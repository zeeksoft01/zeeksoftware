export interface Product {
  id: string;
  name: string;
  category: string;
  image: string;
  shortDescription: string;
  detailedDescription: string;
  price: number; // in NGN
  priceSourceCurrency?: 'NGN' | 'USD';
  usdPrice?: number; // original USD price retained across rate updates
  duration: string; // e.g. "1 Month", "6 Months", "1 Year", "18 Months", "Lifetime"
  isAvailable: boolean;
  isFeatured: boolean;
  seoTitle?: string;
  seoDescription?: string;
  fulfillmentInstructions?: string;
  displayOrder?: number;
  commissionRateOverride?: number; // optional product-specific affiliate commission %
  deliveryConfig?: ProductDeliveryConfig;
}

export type DestinationType = 'whatsapp' | 'custom_url' | 'digital_download';

export interface ProductDeliveryConfig {
  destinationType: 'default' | DestinationType;
  whatsappNumber?: string;
  whatsappMessageTemplate?: string;
  customRedirectUrl?: string;
  digitalAssetId?: string;
  digitalFileName?: string;
  digitalFileSize?: number;
  digitalMimeType?: string;
}

export interface PostPaymentConfig {
  defaultDestinationType: DestinationType;
  whatsappNumber?: string;
  whatsappMessageTemplate: string;
  customRedirectUrl?: string;
  downloadPageHeadline?: string;
  downloadPageInstructions?: string;
}

export interface EmailBrandingConfig {
  websiteUrl?: string;
  footerNote?: string;
  facebookUrl?: string;
  instagramUrl?: string;
  twitterUrl?: string;
  youtubeUrl?: string;
  batchSize: number;
  batchDelayMs: number;
  dailySendLimit: number;
  orderConfirmationSubject?: string;
  orderConfirmationIntro?: string;
  thankYouEnabled?: boolean;
  thankYouSubject?: string;
  thankYouGreeting?: string;
  thankYouBodyHtml?: string;
  thankYouWhatsappBtnLabel?: string;
  thankYouTelegramBtnLabel?: string;
}

export interface HeroSlide {
  id: string;
  badge: string; // Eyebrow text
  headline: string;
  supportingText: string;
  cta1Label: string;
  cta1Action: string; // e.g. 'products', 'whatsapp', 'about', 'affiliate'
  cta2Label?: string;
  cta2Action?: string;
  backgroundImage: string; // High-res cinematic photography
  bgGradient?: string;
  accentColor?: string;
  visualType?: 'photo' | 'floating_logos';
  enableFloatingLogos?: boolean;
  isActive: boolean;
  displayOrder?: number;
  overlayOpacity?: number; // 0 to 1, default 0.72
  backgroundPosition?: string; // e.g. 'center right', 'center center', 'center left', 'top center'
  textAlignment?: 'left' | 'center' | 'right';
}

export interface BenefitCard {
  id: string;
  title: string;
  text: string;
  iconName: string;
}

export interface CustomerReview {
  id: string;
  customerName: string;
  rating: number; // 1-5
  reviewMessage: string;
  productPurchased?: string;
  reviewDate: string;
  isApproved: boolean;
  isFeatured: boolean;
  orderId?: string;
}

export interface OrderItem {
  productId: string;
  productName: string;
  duration: string;
  price: number;
  quantity: number;
  category: string;
}

export type OrderStatus =
  | 'Awaiting Payment'
  | 'Payment Submitted'
  | 'Payment Confirmed'
  | 'Awaiting Fulfillment'
  | 'Processing'
  | 'Delivered'
  | 'Activation Completed'
  | 'Support Required'
  | 'Refunded'
  | 'Cancelled';

export type PaymentMethod =
  | 'Paystack'
  | 'Direct Bank Transfer'
  | 'USDT'
  | 'Bybit'
  | 'Binance';

export interface Order {
  id: string; // e.g. ZEEK-ORD-104928
  customerName: string;
  customerEmail: string;
  customerWhatsApp: string;
  items: OrderItem[];
  totalAmount: number; // NGN
  paymentMethod: PaymentMethod;
  paymentStatus: 'pending' | 'awaiting_verification' | 'paid' | 'failed' | 'refunded';
  fulfillmentStatus: OrderStatus;
  paymentReference?: string;
  transactionHash?: string;
  proofNote?: string;
  proofImage?: string;
  verifiedBy?: string;
  verifiedAt?: string;
  fulfillmentNotes?: string;
  activationCredentials?: string;
  
  // Affiliate Attribution
  referralCode?: string;
  affiliateId?: string;
  commissionAwarded?: boolean;
  commissionSkippedReason?: string;
  thankYouEmailSentAt?: string;

  createdAt: string;
  updatedAt: string;
}

export interface AffiliateGuideSection {
  id: string;
  stepNumber: string;
  title: string;
  content: string;
  imageUrl?: string;
  linkLabel?: string;
  linkUrl?: string;
  displayOrder: number;
}

export interface AffiliateHighlightItem {
  label: string;
  value: string;
  subtitle: string;
}

export interface AffiliateGuideConfig {
  buttonText: string;
  title: string;
  description: string;
  heroImageUrl?: string;
  promoEyebrow?: string;
  promoHeadline?: string;
  promoDescription?: string;
  registerTitle?: string;
  registerSubtitle?: string;
  highlightCards?: AffiliateHighlightItem[];
  ctaBannerTitle?: string;
  ctaBannerDescription?: string;
  sections: AffiliateGuideSection[];
}

export interface SiteSettings {
  storeName: string;
  tagline: string;
  secondaryTagline: string;
  slogan: string;
  supportWhatsApp: string;
  internationalWhatsApp: string;
  supportEmail: string;
  telegramUsername: string;
  telegramChannelUrl: string;
  whatsappCommunityUrl: string;
  currency: string;

  // Brand Identity / Logos
  logoUrl?: string;
  lightLogoUrl?: string;
  darkLogoUrl?: string;
  faviconUrl?: string;
  mobileIconUrl?: string;
  logoWidth?: number;
  logoHeight?: number;
  socialShareImageUrl?: string;
  
  // Bank details (Merchant)
  bankName: string;
  accountNumber: string;
  accountName: string;
  
  // Crypto details
  usdtEnabled: boolean;
  usdtNetworks: Array<{ network: string; address: string; memo?: string }>;
  usdtNgnRate: number; // e.g. 1550 NGN per USDT
  usdNgnRate: number; // Admin-controlled manual USD -> NGN exchange rate for USD-priced products
  bybitUid: string;
  bybitEnabled: boolean;
  binanceUid: string;
  binanceEnabled: boolean;
  
  // Paystack
  paystackEnabled: boolean;
  paystackPublicKey: string;
  paystackMode: 'test' | 'live';
  
  // Announcement banner
  announcementText: string;
  announcementActive: boolean;
  
  // Theme highlights
  primaryColor: string;
  accentColor: string;

  // Hero Slider animation config
  heroAutoplayDuration?: number; // in ms, default 4000
  heroTransitionSpeed?: number; // in ms, default 900

  // Affiliate System Settings
  defaultCommissionRate: number; // Global default %, e.g. 10
  productCommissionRates: Record<string, number>; // Product ID -> commission %
  recurringCommissionsEnabled: boolean; // ON = recurring orders earn commission, OFF = first order only
  minWithdrawalAmount: number; // in NGN, default 100
  referralCookieDays: number; // default 30
  affiliateGuide?: AffiliateGuideConfig;
  postPaymentConfig?: PostPaymentConfig;
  emailBranding?: EmailBrandingConfig;
}

export interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category?: string;
}

export interface LegalPolicies {
  lastUpdated: string;
  privacyPolicy: string;
  refundPolicy: string;
  renewalGuidelines: string;
  affiliateTerms?: string;
}

export type InquiryStatus = 'New' | 'Replied' | 'Awaiting Response' | 'Resolved';

export interface InquiryReply {
  id: string;
  toEmail: string;
  subject: string;
  message: string;
  sentBy: string;
  sentAt: string;
  status: 'sent' | 'failed';
  messageId?: string;
  error?: string;
}

export interface ContactMessage {
  id: string;
  fullName: string;
  email: string;
  whatsApp?: string;
  subject: string;
  message: string;
  createdAt: string;
  updatedAt?: string;
  isRead: boolean;
  status?: InquiryStatus;
  replies?: InquiryReply[];
}

export interface AuditLog {
  id: string;
  action: string;
  details: string;
  adminUser: string;
  timestamp: string;
}

// -------------------------------------------------------------
// AFFILIATE MARKETING SYSTEM TYPES
// -------------------------------------------------------------

export interface Affiliate {
  _id: string; // MongoDB ObjectId
  userId: string; // References SystemUser._id in users collection
  fullName: string;
  email: string;
  phone: string;
  profilePicture?: string;
  referralCode: string; // e.g. ZEEK8291
  status: UserStatus;
  
  // Bank Information for Payouts
  bankName: string;
  accountNumber: string;
  accountName: string;

  // Balances
  availableBalance: number; // Eligible for withdrawal (min ₦100)
  pendingBalance: number; // In verification period
  totalEarned: number; // Lifetime legit commissions
  totalWithdrawn: number; // Total successfully paid out
  reservedWithdrawalBalance: number; // Currently locked in pending withdrawals
  
  totalReferredSalesCount: number;
  totalClicks: number;

  createdAt: string;
  updatedAt: string;
}

export interface ReferralClick {
  id: string;
  affiliateId: string;
  referralCode: string;
  targetPath?: string;
  timestamp: string;
}

export interface ReferralAttribution {
  id: string;
  customerEmail: string;
  customerName?: string;
  customerWhatsApp?: string;
  affiliateId: string;
  referralCode: string;
  firstOrderId?: string;
  firstCommissionOrderId?: string;
  firstPurchaseCompleted: boolean;
  totalOrdersCount: number;
  totalCommissionedOrdersCount: number;
  lastOrderId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AffiliateCommission {
  id: string;
  affiliateId: string;
  orderId: string;
  productId: string;
  productName: string;
  productDuration: string;
  orderAmount: number; // NGN
  commissionRate: number; // % applied
  commissionAmount: number; // in NGN
  status: 'eligible' | 'pending' | 'reversed';
  createdAt: string;
}

export type WithdrawalStatus =
  | 'Pending Review'
  | 'Approved'
  | 'Processing Payment'
  | 'Payment Sent'
  | 'Withdrawal Successful'
  | 'Declined';

export interface AffiliateWithdrawal {
  id: string; // e.g. ZEEK-WTH-104928
  affiliateId: string;
  affiliateName: string;
  affiliateEmail: string;
  amount: number; // NGN (min ₦100)
  bankName: string;
  accountNumber: string; // Masked for display
  accountName: string;
  status: WithdrawalStatus;
  rejectionReason?: string;
  transferReference?: string;
  paymentDate?: string;
  adminNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AffiliateLedgerEntry {
  id: string;
  affiliateId: string;
  type:
    | 'commission'
    | 'withdrawal_reserve'
    | 'withdrawal_success'
    | 'withdrawal_declined_refund'
    | 'admin_credit'
    | 'admin_debit';
  amount: number;
  referenceId?: string;
  description: string;
  balanceBefore: number;
  balanceAfter: number;
  adminUser?: string;
  createdAt: string;
}

export type UserRole = 'affiliate' | 'admin' | 'user';
export type UserStatus = 'active' | 'pending' | 'suspended' | 'disabled';

export interface SystemUser {
  _id: string;
  fullName: string;
  name?: string;
  email: string;
  phone?: string;
  profilePicture?: string;
  role: UserRole;
  status: UserStatus;
  isVerified: boolean;
  isActive: boolean;
  createdBy?: string;
  verifiedBy?: string;
  verifiedAt?: string;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

export type EmailContactCategory =
  | 'All Contacts'
  | 'Affiliates'
  | 'Newly Registered Affiliates'
  | 'New Customers'
  | 'Existing Customers'
  | 'Repeat Customers'
  | 'New Emails';

export type EmailContactSource =
  | 'customer_registration'
  | 'affiliate_registration'
  | 'checkout'
  | 'purchase'
  | 'contact_form'
  | 'manual'
  | 'csv_import'
  | 'paste_import'
  | 'sync';

export type MarketingConsentStatus = 'subscribed' | 'pending' | 'unsubscribed' | 'suppressed';

export interface EmailContact {
  id: string;
  email: string;
  fullName: string;
  whatsApp?: string;
  source: EmailContactSource;
  categories: string[];
  userId?: string;
  affiliateId?: string;
  orderCount: number;
  paidOrderCount: number;
  totalSpent: number;
  lastPurchaseAt?: string;
  purchasedProductIds: string[];
  marketingConsent: MarketingConsentStatus;
  consentSource?: string;
  consentTimestamp?: string;
  unsubscribeToken: string;
  unsubscribedAt?: string;
  unsubscribeReason?: string;
  bounceCount: number;
  lastBounceReason?: string;
  suppressedAt?: string;
  notes?: string;
  collectedAt: string;
  createdAt: string;
  updatedAt: string;
}

export type CampaignStatus =
  | 'draft'
  | 'scheduled'
  | 'queued'
  | 'sending'
  | 'paused'
  | 'completed'
  | 'cancelled'
  | 'failed';

export type CampaignTargetType = 'all' | 'categories' | 'individuals' | 'segments';

export interface EmailCampaign {
  id: string;
  name: string;
  subject: string;
  preheader?: string;
  htmlBody: string;
  textBody?: string;
  bannerImageUrl?: string;
  ctaLabel?: string;
  ctaUrl?: string;
  targetType: CampaignTargetType;
  targetCategories: string[];
  targetProductIds?: string[];
  inactiveDays?: number;
  neverPurchasedOnly?: boolean;
  targetEmails: string[];
  status: CampaignStatus;
  scheduledFor?: string;
  totalRecipients: number;
  sentCount: number;
  deliveredCount: number;
  failedCount: number;
  bouncedCount: number;
  openCount: number;
  clickCount: number;
  unsubscribeCount: number;
  startedAt?: string;
  completedAt?: string;
  lastError?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface EmailSendLog {
  id: string;
  campaignId?: string;
  dailyKey?: string;
  orderId?: string;
  sendType: 'campaign' | 'daily_automation' | 'transactional' | 'thank_you' | 'test';
  recipientEmail: string;
  recipientName?: string;
  subject: string;
  status: 'queued' | 'sending' | 'sent' | 'delivered' | 'failed' | 'bounced';
  attempts: number;
  maxAttempts: number;
  nextRetryAt?: string;
  provider?: string;
  messageId?: string;
  error?: string;
  openedAt?: string;
  openCount: number;
  clickedAt?: string;
  clickCount: number;
  sentAt?: string;
  createdAt: string;
  updatedAt: string;
}

export type DayOfWeekKey =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday';

export interface DailyEmailDayConfig {
  day: DayOfWeekKey;
  title: string;
  enabled: boolean;
  subject: string;
  greetingTemplate: string;
  bodyHtml: string;
  imageUrl?: string;
  ctaLabel?: string;
  ctaUrl?: string;
  lastRunDate?: string;
}

export interface DailyAutomationConfig {
  key: string;
  enabled: boolean;
  sendTime: string;
  timezone: string;
  targetCategories: string[];
  days: Record<DayOfWeekKey, DailyEmailDayConfig>;
  updatedAt: string;
}

export interface DigitalAsset {
  id: string;
  title: string;
  originalFileName: string;
  storedFileName: string;
  mimeType: string;
  sizeBytes: number;
  sha256?: string;
  uploadedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProductDeliveryRecord {
  id: string;
  orderId: string;
  productId: string;
  productName: string;
  customerName: string;
  customerEmail: string;
  customerWhatsApp?: string;
  paymentStatus: Order['paymentStatus'];
  destinationType: DestinationType;
  destinationUrl?: string;
  digitalAssetId?: string;
  digitalFileName?: string;
  downloadToken: string;
  downloadEnabled: boolean;
  deliveryStatus: 'pending_payment' | 'link_generated' | 'delivered' | 'downloaded' | 'revoked';
  downloadCount: number;
  firstAccessedAt?: string;
  lastAccessedAt?: string;
  lastCompletedAt?: string;
  resentCount: number;
  lastResentAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface EmailImportHistoryItem {
  id: string;
  fileName: string;
  source: 'csv_import' | 'paste_import';
  duplicateMode: 'skip' | 'update';
  categories: string[];
  hasPermissionToEmail: boolean;
  totalRows: number;
  imported: number;
  updated: number;
  skippedExisting: number;
  duplicatesSkipped: number;
  suppressedProtected: number;
  invalidCount: number;
  invalidSample: string[];
  importedBy: string;
  createdAt: string;
}


