export interface Product {
  id: string;
  name: string;
  category: string;
  image: string;
  shortDescription: string;
  detailedDescription: string;
  price: number;
  priceSourceCurrency?: 'NGN' | 'USD';
  usdPrice?: number;
  duration: string;
  isAvailable: boolean;
  isFeatured: boolean;
  seoTitle?: string;
  seoDescription?: string;
  fulfillmentInstructions?: string;
  displayOrder?: number;
  commissionRateOverride?: number;
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
  badge: string;
  headline: string;
  supportingText: string;
  cta1Label: string;
  cta1Action: string;
  cta2Label?: string;
  cta2Action?: string;
  backgroundImage: string;
  bgGradient?: string;
  accentColor?: string;
  visualType?: 'photo' | 'floating_logos';
  enableFloatingLogos?: boolean;
  isActive: boolean;
  displayOrder?: number;
  overlayOpacity?: number;
  backgroundPosition?: string;
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
  rating: number;
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
  id: string;
  customerName: string;
  customerEmail: string;
  customerWhatsApp: string;
  items: OrderItem[];
  totalAmount: number;
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
  logoUrl?: string;
  lightLogoUrl?: string;
  darkLogoUrl?: string;
  faviconUrl?: string;
  mobileIconUrl?: string;
  logoWidth?: number;
  logoHeight?: number;
  socialShareImageUrl?: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
  usdtEnabled: boolean;
  usdtNetworks: Array<{ network: string; address: string; memo?: string }>;
  usdtNgnRate: number;
  usdNgnRate: number;
  bybitUid: string;
  bybitEnabled: boolean;
  binanceUid: string;
  binanceEnabled: boolean;
  paystackEnabled: boolean;
  paystackPublicKey: string;
  paystackMode: 'test' | 'live';
  announcementText: string;
  announcementActive: boolean;
  primaryColor: string;
  accentColor: string;
  heroAutoplayDuration?: number;
  heroTransitionSpeed?: number;
  defaultCommissionRate: number;
  productCommissionRates: Record<string, number>;
  recurringCommissionsEnabled: boolean;
  minWithdrawalAmount: number;
  referralCookieDays: number;
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

export interface Affiliate {
  _id: string;
  userId: string; // References SystemUser._id in users collection
  fullName: string; // Hydrated from referenced User
  email: string; // Hydrated from referenced User
  phone: string; // Hydrated from referenced User
  profilePicture?: string; // Hydrated from referenced User
  referralCode: string;
  status: UserStatus; // Hydrated from referenced User.status
  bankName: string;
  accountNumber: string;
  accountName: string;
  availableBalance: number;
  pendingBalance: number;
  totalEarned: number;
  totalWithdrawn: number;
  reservedWithdrawalBalance: number;
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
  orderAmount: number;
  commissionRate: number;
  commissionAmount: number;
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
  id: string;
  affiliateId: string;
  affiliateName: string;
  affiliateEmail: string;
  amount: number;
  bankName: string;
  accountNumber: string;
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
  passwordHash?: string;
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
  sendTime: string; // HH:mm (24h)
  timezone: string; // Africa/Lagos
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


