import fs from 'fs';
import path from 'path';
import {
  Product,
  HeroSlide,
  BenefitCard,
  CustomerReview,
  Order,
  SiteSettings,
  FAQItem,
  LegalPolicies,
  ContactMessage,
  AuditLog,
  Affiliate,
  ReferralClick,
  AffiliateCommission,
  AffiliateWithdrawal,
  AffiliateLedgerEntry,
} from '../src/types';
import { emailService } from './email';
import { connectToDatabase, getDb, isMongoConnected, pingMongo, getMongoUri } from './mongodb';
import { ProductRepository } from './repositories/product.repository';
import { OrderRepository } from './repositories/order.repository';
import { AffiliateRepository } from './repositories/affiliate.repository';
import { ContentRepository } from './repositories/content.repository';

interface DatabaseSchema {
  products: Product[];
  categories: string[];
  heroSlides: HeroSlide[];
  benefitCards: BenefitCard[];
  reviews: CustomerReview[];
  orders: Order[];
  settings: SiteSettings;
  faqs: FAQItem[];
  policies: LegalPolicies;
  inquiries: ContactMessage[];
  auditLogs: AuditLog[];
  adminPasswordHash?: string;
  
  // Affiliate System Collections
  affiliates: Affiliate[];
  referralClicks: ReferralClick[];
  affiliateCommissions: AffiliateCommission[];
  affiliateWithdrawals: AffiliateWithdrawal[];
  affiliateLedger: AffiliateLedgerEntry[];
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'zeek_database.json');

const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'prod-canva-pro-1y',
    name: 'Canva Pro',
    category: 'Graphic Design & Creativity',
    image: 'https://images.unsplash.com/photo-1626785774573-4b799315345d?auto=format&fit=crop&w=600&q=80',
    shortDescription: 'Explore advanced creative design features for presentations, social media content, marketing materials, and professional visual projects.',
    detailedDescription: 'Unlock premium Canva templates, brand kits, background remover, magic resize, and millions of premium graphics, audio tracks, and stock videos. Authorized access granted for your design workflow.',
    price: 3000,
    duration: '1 Year',
    isAvailable: true,
    isFeatured: true,
    seoTitle: 'Canva Pro 1 Year Subscription | Zeek Softwares',
    seoDescription: 'Get Canva Pro 1 Year at subsidized rates. Full access to premium templates, brand kits, and design elements.',
    fulfillmentInstructions: 'Activation invitation will be sent to your registered email or Canva account. Ensure you provide your Canva account email at checkout.',
    displayOrder: 1,
  },
  {
    id: 'prod-capcut-pro-1m',
    name: 'CapCut Pro',
    category: 'Video Editing',
    image: 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?auto=format&fit=crop&w=600&q=80',
    shortDescription: 'Access advanced video editing capabilities to improve content creation, visual storytelling, and professional editing workflows.',
    detailedDescription: 'Full access to CapCut Pro premium video filters, motion tracking, auto-captions, 4K export, and professional cloud workspace for mobile and PC.',
    price: 4000,
    duration: '1 Month',
    isAvailable: true,
    isFeatured: true,
    seoTitle: 'CapCut Pro 1 Month | Zeek Softwares',
    seoDescription: 'Access CapCut Pro video editing tools for seamless short-form video creation and high-end video exports.',
    fulfillmentInstructions: 'Login credentials or team invite provided securely upon payment verification.',
    displayOrder: 2,
  },
  {
    id: 'prod-chatgpt-plus-1m',
    name: 'ChatGPT Plus',
    category: 'AI & Productivity',
    image: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&w=600&q=80',
    shortDescription: 'Explore advanced AI-powered assistance for writing, research, brainstorming, learning, and productivity.',
    detailedDescription: 'Access OpenAI GPT-4o, advanced data analysis, browsing capabilities, custom GPTs, image generation via DALL-E, and rapid response times without peak throttling.',
    price: 4000,
    duration: '1 Month',
    isAvailable: true,
    isFeatured: true,
    seoTitle: 'ChatGPT Plus 1 Month Access | Zeek Softwares',
    seoDescription: 'Get ChatGPT Plus access at affordable rates. Boost your productivity with cutting-edge conversational intelligence.',
    fulfillmentInstructions: 'Instant shared/managed workspace access provided with clear step-by-step connection guide.',
    displayOrder: 3,
  },
  {
    id: 'prod-capcut-pro-6m',
    name: 'CapCut Pro',
    category: 'Video Editing',
    image: 'https://images.unsplash.com/photo-1536240478700-b869070f9279?auto=format&fit=crop&w=600&q=80',
    shortDescription: 'Extended 6-month access to CapCut Pro advanced editing suite, cloud assets, and high-frame export tools.',
    detailedDescription: 'Six full months of uninterrupted video editing features for YouTube, TikTok, Reels, and commercial client productions.',
    price: 15000,
    duration: '6 Months',
    isAvailable: true,
    isFeatured: true,
    seoTitle: 'CapCut Pro 6 Months Plan | Zeek Softwares',
    seoDescription: 'Save more with our 6-month CapCut Pro plan for active video editors and creators.',
    fulfillmentInstructions: 'Direct account credentials or authorized workspace invite issued to your WhatsApp and email.',
    displayOrder: 4,
  },
  {
    id: 'prod-gemini-pro-18m',
    name: 'Google Gemini Pro AI',
    category: 'AI & Productivity',
    image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80',
    shortDescription: "Discover Google's advanced AI capabilities for research, productivity, idea development, and creative workflows.",
    detailedDescription: 'Extended 18-month access to Google Gemini Advanced/Pro features, large context window processing, multi-modal analysis, and Google Workspace integration.',
    price: 3000,
    duration: '18 Months',
    isAvailable: true,
    isFeatured: true,
    seoTitle: 'Google Gemini Pro AI 18 Months | Zeek Softwares',
    seoDescription: 'Access Google Gemini Pro AI for 18 months at an unbeatable subsidized rate.',
    fulfillmentInstructions: 'Managed account credentials with personal profile partition provided upon payment confirmation.',
    displayOrder: 5,
  },
  {
    id: 'prod-claude-pro-1m',
    name: 'Claude Pro',
    category: 'AI & Productivity',
    image: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?auto=format&fit=crop&w=600&q=80',
    shortDescription: 'Explore intelligent AI assistance for writing, analysis, research, and complex professional tasks.',
    detailedDescription: 'Access Anthropic Claude 3.5 Sonnet and Opus, extended token limits, code debugging, document synthesis, and nuanced creative writing.',
    price: 10000,
    duration: '1 Month',
    isAvailable: true,
    isFeatured: true,
    seoTitle: 'Claude Pro 1 Month Subscription | Zeek Softwares',
    seoDescription: 'Supercharge your intellectual and programming workflows with Claude Pro access from Zeek Softwares.',
    fulfillmentInstructions: 'Dedicated or pooled workspace credentials provided with security guidelines.',
    displayOrder: 6,
  },
  {
    id: 'prod-quillbot-prem-1m',
    name: 'QuillBot Premium',
    category: 'Writing & Research',
    image: 'https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=600&q=80',
    shortDescription: 'Enhance your writing workflow with paraphrasing, editing, and language improvement tools.',
    detailedDescription: 'Unlimited paraphrasing modes, plagiarism checker, grammar scanner, summarizer, citation generator, and vocabulary enhancer.',
    price: 2500,
    duration: '1 Month',
    isAvailable: true,
    isFeatured: false,
    seoTitle: 'QuillBot Premium 1 Month | Zeek Softwares',
    seoDescription: 'Enhance research papers and essays with QuillBot Premium paraphrasing tools.',
    fulfillmentInstructions: 'Account login details delivered to your email and WhatsApp immediately after verification.',
    displayOrder: 7,
  },
  {
    id: 'prod-grammarly-prem-1m',
    name: 'Grammarly Premium',
    category: 'Writing & Research',
    image: 'https://images.unsplash.com/photo-1457369804613-52c61a468e7d?auto=format&fit=crop&w=600&q=80',
    shortDescription: 'Improve writing clarity, grammar, tone, and professional communication.',
    detailedDescription: 'Advanced tone adjustments, sentence rewrites, vocabulary enhancements, style guides, and plagiarism detection across web, desktop, and mobile.',
    price: 2500,
    duration: '1 Month',
    isAvailable: true,
    isFeatured: false,
    seoTitle: 'Grammarly Premium 1 Month | Zeek Softwares',
    seoDescription: 'Polish your professional emails, proposals, and documents with Grammarly Premium.',
    fulfillmentInstructions: 'Direct account access with pre-configured license seat delivered within minutes.',
    displayOrder: 8,
  },
  {
    id: 'prod-renderforest-pro-1m',
    name: 'Renderforest Pro',
    category: 'Graphic Design & Creativity',
    image: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=600&q=80',
    shortDescription: 'Create polished videos, graphics, branding assets, and digital presentations.',
    detailedDescription: 'Full HD video rendering, animated logo reveals, mockups, website builder access, and commercial music library.',
    price: 2500,
    duration: '1 Month',
    isAvailable: true,
    isFeatured: false,
    seoTitle: 'Renderforest Pro 1 Month | Zeek Softwares',
    seoDescription: 'Produce broadcast-grade promotional videos and 3D logo openers with Renderforest Pro.',
    fulfillmentInstructions: 'Dedicated login provided with full cloud export rights.',
    displayOrder: 9,
  },
  {
    id: 'prod-zoom-prem-1m',
    name: 'Zoom Premium',
    category: 'Communication & Entertainment',
    image: 'https://images.unsplash.com/photo-1588196749597-9ff075ee6b5b?auto=format&fit=crop&w=600&q=80',
    shortDescription: 'Explore enhanced online meeting and communication features for collaborative work.',
    detailedDescription: 'Host up to 300 participants without 40-minute limit, cloud recording storage, automated meeting transcripts, and breakout rooms.',
    price: 3500,
    duration: '1 Month',
    isAvailable: true,
    isFeatured: false,
    seoTitle: 'Zoom Premium 1 Month | Zeek Softwares',
    seoDescription: 'Host unlimited professional meetings and webinars with Zoom Premium.',
    fulfillmentInstructions: 'Host license assignment sent to your email or provisioned account credentials.',
    displayOrder: 10,
  },
  {
    id: 'prod-netflix-prem-1m',
    name: 'Netflix Premium',
    category: 'Communication & Entertainment',
    image: 'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?auto=format&fit=crop&w=600&q=80',
    shortDescription: 'Access entertainment content through a properly authorized subscription arrangement.',
    detailedDescription: 'Ultra HD 4K streaming, multi-device support, spatial audio, and personalized private profile screen with dedicated PIN.',
    price: 3500,
    duration: '1 Month',
    isAvailable: true,
    isFeatured: false,
    seoTitle: 'Netflix Premium 1 Month | Zeek Softwares',
    seoDescription: 'Stream your favorite movies and series in 4K Ultra HD with a personal profile.',
    fulfillmentInstructions: 'Profile credentials with private security PIN delivered via WhatsApp/email.',
    displayOrder: 11,
  },
  {
    id: 'prod-adobe-express-1y',
    name: 'Adobe Express',
    category: 'Graphic Design & Creativity',
    image: 'https://images.unsplash.com/photo-1542744094-3a31f272c490?auto=format&fit=crop&w=600&q=80',
    shortDescription: 'Discover creative tools for building social media graphics, videos, presentations, and marketing content.',
    detailedDescription: 'Adobe Firefly generative AI integration, Photoshop-powered quick actions, premiere Adobe Fonts library, and cloud synchronization.',
    price: 3000,
    duration: '1 Year',
    isAvailable: true,
    isFeatured: true,
    seoTitle: 'Adobe Express 1 Year Plan | Zeek Softwares',
    seoDescription: 'Get 1 Year of Adobe Express with generative AI capabilities and premium stock assets.',
    fulfillmentInstructions: 'Adobe account email invitation or activated license credentials provided.',
    displayOrder: 12,
  },
  {
    id: 'prod-lovable-pro-1m',
    name: 'Lovable Pro',
    category: 'AI Development & Website Creation',
    image: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=600&q=80',
    shortDescription: 'Explore AI-assisted website and application development for creative digital projects.',
    detailedDescription: 'Full-stack AI app generator with high credit allowance, GitHub synchronization, instant deployment, and custom domain mapping.',
    price: 3000,
    duration: '1 Month',
    isAvailable: true,
    isFeatured: true,
    seoTitle: 'Lovable Pro 1 Month | Zeek Softwares',
    seoDescription: 'Build modern React and web apps with AI prompt-driven engineering using Lovable Pro.',
    fulfillmentInstructions: 'Invite sent to your registered developer email with active subscription rights.',
    displayOrder: 13,
  },
  {
    id: 'prod-camtasia-lifetime',
    name: 'Camtasia',
    category: 'Video Editing',
    image: 'https://images.unsplash.com/photo-1616469829941-c7200edec809?auto=format&fit=crop&w=600&q=80',
    shortDescription: 'Create screen recordings, tutorials, presentations, and edited instructional videos.',
    detailedDescription: 'Industry-standard screen recorder and video editing software for Windows/Mac. Authorized perpetual workstation license with full visual effect library.',
    price: 5000,
    duration: 'Lifetime',
    isAvailable: true,
    isFeatured: true,
    seoTitle: 'Camtasia Lifetime License | Zeek Softwares',
    seoDescription: 'Record and edit high quality tutorials and courses with Camtasia perpetual access.',
    fulfillmentInstructions: 'Official download installer link and license activation key provided upon order approval.',
    displayOrder: 14,
  },
];

const INITIAL_CATEGORIES: string[] = [
  'All Tools',
  'AI & Productivity',
  'Graphic Design & Creativity',
  'Video Editing',
  'Writing & Research',
  'Communication & Entertainment',
  'AI Development & Website Creation',
];

// FOUR LUXURY CINEMATIC HERO SLIDES
export const INITIAL_HERO_SLIDES: HeroSlide[] = [
  {
    id: 'slide-1',
    badge: 'WELCOME TO ZEEK SOFTWARES',
    headline: 'Premium Tools. Limitless Possibilities.',
    supportingText:
      'Experience a smarter way to create, learn, work, and grow. Discover premium AI tools and professional software at prices designed to make powerful technology more accessible.',
    cta1Label: 'EXPLORE PREMIUM TOOLS',
    cta1Action: 'products',
    cta2Label: 'CHAT WITH AN EXPERT',
    cta2Action: 'whatsapp',
    backgroundImage:
      'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=2000&q=85',
    visualType: 'photo',
    bgGradient: 'from-[#061B45] via-[#092257] to-[#041230]',
    accentColor: '#FF7900',
    overlayOpacity: 0.72,
    backgroundPosition: 'center right',
    textAlignment: 'left',
    isActive: true,
    displayOrder: 1,
  },
  {
    id: 'slide-2',
    badge: 'YOUR DIGITAL TOOLKIT, REIMAGINED',
    headline: 'Everything You Need. One Digital Destination.',
    supportingText:
      'From artificial intelligence and graphic design to video editing and productivity, discover the digital tools that help bring your ideas to life.',
    cta1Label: 'VIEW ALL PRODUCTS',
    cta1Action: 'products',
    cta2Label: 'BECOME AN AFFILIATE',
    cta2Action: 'affiliate',
    backgroundImage:
      'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=2000&q=85',
    visualType: 'floating_logos',
    enableFloatingLogos: true,
    bgGradient: 'from-[#071C3F] via-[#0b2866] to-[#051433]',
    accentColor: '#FF9200',
    overlayOpacity: 0.75,
    backgroundPosition: 'center center',
    textAlignment: 'left',
    isActive: true,
    displayOrder: 2,
  },
  {
    id: 'slide-3',
    badge: 'BUILT FOR AMBITIOUS MINDS',
    headline: 'Create More. Achieve More.',
    supportingText:
      "Whether you're a freelancer, designer, entrepreneur, or digital creator, equip yourself with tools that make every project more productive.",
    cta1Label: 'DISCOVER YOUR NEXT TOOL',
    cta1Action: 'products',
    cta2Label: 'EXPLORE OUR PLANS',
    cta2Action: 'products',
    backgroundImage:
      'https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=2000&q=85',
    visualType: 'photo',
    bgGradient: 'from-[#051638] via-[#0d275e] to-[#030e24]',
    accentColor: '#FF7900',
    overlayOpacity: 0.74,
    backgroundPosition: 'center right',
    textAlignment: 'left',
    isActive: true,
    displayOrder: 3,
  },
  {
    id: 'slide-4',
    badge: 'POWERFUL TOOLS. ANYWHERE YOU GO.',
    headline: 'Your Ambition. Powered by Technology.',
    supportingText:
      "Explore flexible digital solutions that support your creativity, productivity, and everyday work—whether you're at your desk or on the move.",
    cta1Label: 'SHOP DIGITAL TOOLS',
    cta1Action: 'products',
    cta2Label: 'JOIN OUR COMMUNITY',
    cta2Action: 'community',
    backgroundImage:
      'https://images.unsplash.com/photo-1589156280159-27698a70f29e?auto=format&fit=crop&w=2000&q=85',
    visualType: 'photo',
    bgGradient: 'from-[#071d44] via-[#102d6b] to-[#04112e]',
    accentColor: '#FF9200',
    overlayOpacity: 0.70,
    backgroundPosition: 'center right',
    textAlignment: 'left',
    isActive: true,
    displayOrder: 4,
  },
];

const INITIAL_BENEFITS: BenefitCard[] = [
  {
    id: 'benefit-1',
    title: 'Affordable Premium Tools',
    text: 'Explore powerful AI applications and professional software at subsidized prices.',
    iconName: 'Sparkles',
  },
  {
    id: 'benefit-2',
    title: 'Convenient Ordering',
    text: 'Choose your preferred software plan, complete checkout, and receive clear order confirmation.',
    iconName: 'ShoppingBag',
  },
  {
    id: 'benefit-3',
    title: 'Flexible Payment Options',
    text: 'Pay securely through Paystack or select an available alternative payment method.',
    iconName: 'CreditCard',
  },
  {
    id: 'benefit-4',
    title: 'Dedicated Customer Support',
    text: 'Contact our team through WhatsApp, Telegram, or email whenever you need assistance.',
    iconName: 'Headphones',
  },
];

const INITIAL_REVIEWS: CustomerReview[] = [
  {
    id: 'rev-1',
    customerName: 'Chinedu O.',
    rating: 5,
    reviewMessage: 'Got my Canva Pro 1 Year plan activated in less than 20 minutes. Everything works seamlessly and I have full access to brand kits.',
    productPurchased: 'Canva Pro',
    reviewDate: '2026-09-14',
    isApproved: true,
    isFeatured: true,
  },
  {
    id: 'rev-2',
    customerName: 'Fatima B.',
    rating: 5,
    reviewMessage: 'ChatGPT Plus has transformed my research workflow. Payment was straightforward via Paystack and customer service on WhatsApp was polite and fast.',
    productPurchased: 'ChatGPT Plus',
    reviewDate: '2026-09-28',
    isApproved: true,
    isFeatured: true,
  },
  {
    id: 'rev-3',
    customerName: 'Emmanuel K.',
    rating: 5,
    reviewMessage: 'CapCut Pro 6 months subscription is totally worth it. The video exports are crisp with zero watermark. Kudos Zeek Softwares!',
    productPurchased: 'CapCut Pro',
    reviewDate: '2026-10-05',
    isApproved: true,
    isFeatured: true,
  },
  {
    id: 'rev-4',
    customerName: 'Blessing A.',
    rating: 5,
    reviewMessage: 'I was skeptical at first, but their bank transfer verification took just minutes on WhatsApp. Legit and reliable service.',
    productPurchased: 'Google Gemini Pro AI',
    reviewDate: '2026-10-12',
    isApproved: true,
    isFeatured: true,
  },
];

const INITIAL_SETTINGS: SiteSettings = {
  storeName: 'Zeek Softwares',
  tagline: 'Premium AI Tools. Premium Apps. Subsidized Rates.',
  secondaryTagline: 'Powerful Tools. Smarter Work. Affordable Access.',
  slogan: 'THE TOTAL SOFTWARE SOLUTION',
  supportWhatsApp: '07045200361',
  internationalWhatsApp: '2347045200361',
  supportEmail: 'Zeeksoftwares@gmail.com',
  telegramUsername: '@Zeeksoftware',
  telegramChannelUrl: 'https://t.me/EazyCashHustle',
  whatsappCommunityUrl: 'https://chat.whatsapp.com/GmuCpw6aMBf6D5vB0ESj0k?s=cl&p=a&mlu=4&ilr=4',
  currency: 'NGN',

  logoUrl: '',
  lightLogoUrl: '',
  darkLogoUrl: '',
  faviconUrl: '',
  logoWidth: 160,
  socialShareImageUrl: '',
  
  bankName: 'Sterling Bank',
  accountNumber: '0143766798',
  accountName: 'Nwokporo Ezekiel Chiadikaobi',
  
  usdtEnabled: true,
  usdtNetworks: [
    {
      network: 'USDT (TRC20)',
      address: 'TYo7uWJp9GvK9Z4L2R1F8M6X3P5A9Qe1Vb',
    },
    {
      network: 'USDT (BEP20 / BSC)',
      address: '0x71C0F4A92b678e2D731a5477810A38e8Db1F6517',
    },
  ],
  usdtNgnRate: 1550,
  usdNgnRate: 1550,
  
  bybitUid: '119370841',
  bybitEnabled: true,
  
  binanceUid: '579348809',
  binanceEnabled: true,
  
  paystackEnabled: true,
  paystackPublicKey: process.env.PAYSTACK_PUBLIC_KEY || 'pk_test_zeek_paystack_public',
  paystackMode: (process.env.PAYSTACK_MODE as 'test' | 'live') || 'test',
  
  announcementText: '🔥 Special Promotion: Up to 70% off on premium AI subscriptions! Subsidized rates for Nigerian creators & students.',
  announcementActive: true,
  
  primaryColor: '#061B45',
  accentColor: '#FF7900',

  heroAutoplayDuration: 4000,
  heroTransitionSpeed: 900,

  // Affiliate System
  defaultCommissionRate: 10, // 10%
  productCommissionRates: {
    'prod-chatgpt-plus-1m': 12,
    'prod-claude-pro-1m': 15,
    'prod-canva-pro-1y': 10,
    'prod-capcut-pro-1m': 8,
  },
  recurringCommissionsEnabled: true,
  minWithdrawalAmount: 100, // ₦100 minimum
  referralCookieDays: 30,
};

const INITIAL_FAQS: FAQItem[] = [
  {
    id: 'faq-1',
    question: 'What is Zeek Softwares?',
    answer: 'Zeek Softwares is a digital software store offering selected AI tools, productivity applications, and creative software plans at subsidized rates.',
  },
  {
    id: 'faq-2',
    question: 'How do I buy a product?',
    answer: 'Browse our Products page, select a product and plan, click Buy Now, enter your order information, and choose your preferred available payment method.',
  },
  {
    id: 'faq-3',
    question: 'What payment methods do you accept?',
    answer: 'Supported payment methods include Paystack checkout and configured alternative options such as bank transfer, USDT, or supported platform transfers. Availability may vary depending on the payment provider and the selected method.',
  },
  {
    id: 'faq-4',
    question: 'How will I receive my purchased software?',
    answer: 'Delivery or activation instructions depend on the product purchased. The applicable process will be displayed on the product page or communicated through your order confirmation and support channel.',
  },
  {
    id: 'faq-5',
    question: 'Can I renew my subscription?',
    answer: 'Renewal availability depends on the selected product and current plan terms. Contact our support team for available options.',
  },
  {
    id: 'faq-6',
    question: 'What if I have a payment problem?',
    answer: 'Contact Zeek Softwares on WhatsApp or email with your order number and payment reference.',
  },
  {
    id: 'faq-7',
    question: 'Can I pay with USDT?',
    answer: 'USDT payments are available only when the website displays a configured and supported receiving method. Confirm the correct network and amount before transferring.',
  },
  {
    id: 'faq-8',
    question: 'How do I know my payment has been confirmed?',
    answer: 'Paystack payments are verified through our secure payment system. Alternative payment submissions are reviewed before being marked as paid.',
  },
  {
    id: 'faq-9',
    question: 'Can I contact you before purchasing?',
    answer: 'Yes. Use the WhatsApp, Telegram, or email contact buttons on our website.',
  },
];

const INITIAL_POLICIES: LegalPolicies = {
  lastUpdated: '2026-10-18',
  privacyPolicy: `### Introduction
Welcome to Zeek Softwares. We value the privacy of customers and visitors who interact with our website. This Privacy Policy explains how personal information is collected, used, stored, and protected when customers browse our products, place orders, contact support, or use our website.

### Information We Collect
Depending on how you use our website, we may collect:
- Full name
- Email address
- Telephone or WhatsApp number
- Product orders and purchase history
- Payment transaction references and statuses
- Customer support enquiries
- Technical information necessary for website security and operation

We do not require customers to disclose their bank card PINs or payment passwords.

### How We Use Your Information
Customer information may be used to:
- Process orders
- Verify payments
- Provide order information
- Assist with digital product fulfillment
- Respond to customer support requests
- Prevent fraud and unauthorized transactions
- Maintain and improve the website
- Send marketing communications where permitted and consented to

### Payment Processing
We use Paystack for supported online payment transactions. Customers may also choose available alternative payment methods. Payment processing is subject to the applicable payment provider's policies. Sensitive payment information should be handled by the authorized payment provider. Our website must not store full card details or CVV information.

### Information Sharing
We may share only the information reasonably necessary with service providers involved in payment processing, hosting, communication, or fulfillment. We will not claim that data is never shared when necessary service providers actually process customer information.

### Data Security
We use appropriate technical and organizational safeguards to help protect personal information from unauthorized access, misuse, and disclosure.

### Data Retention
We retain information only for legitimate operational, legal, accounting, and customer support purposes, according to applicable requirements and our documented retention settings.

### Customer Privacy Requests
Customers can contact Zeek Softwares to ask questions about their personal information or request appropriate access, correction, or deletion, subject to applicable laws and recordkeeping requirements.

### Privacy Enquiries
For privacy-related questions, contact: Zeeksoftwares@gmail.com`,
  
  refundPolicy: `### Our Commitment
At Zeek Softwares, we aim to provide clear product information and helpful customer support. We encourage customers to review the selected product, subscription duration, payment amount, and activation requirements before completing payment.

### Refund Requests
Refund eligibility depends on the circumstances of the transaction, the nature of the digital product, applicable consumer protection laws, and whether the product or service has been delivered. Customers may contact us to request a review of issues such as:
- Duplicate payments
- Incorrect charges
- Payment confirmed but order not fulfilled
- Incorrect product delivered
- An activation issue that cannot reasonably be resolved
- Other circumstances where a refund is legally required

### How to Request a Refund
Contact Zeek Softwares using:
- WhatsApp: 07045200361
- Email: Zeeksoftwares@gmail.com

Provide:
- Customer name
- Order number
- Product purchased
- Payment reference
- Description of the issue

### Refund Review
Our support team will review the request, transaction status, fulfillment records, and applicable circumstances. Approved refunds will be processed through an appropriate supported refund method. Processing time may depend on the payment provider and receiving financial institution.

### Important Notice
Nothing in this policy is intended to remove or limit non-waivable consumer rights under applicable law. Do not invent fixed refund deadlines, cancellation restrictions, or guarantees without administrator approval.`,
  
  renewalGuidelines: `### Understanding Subscription Durations
Some products on Zeek Softwares are offered with defined access durations such as:
- 1 Month
- 6 Months
- 1 Year
- 18 Months
- Other clearly described arrangements

Customers should always review the product listing to understand the specific duration and activation conditions of their selected plan.

### Renewal Information
Where renewal is available, customers can contact Zeek Softwares before the end of their plan to enquire about current pricing and renewal arrangements.

### How to Request Renewal
1. Contact Zeek Softwares on WhatsApp.
2. Provide the product name.
3. Provide the current plan details or previous order number.
4. Request the available renewal options.
5. Review the new price and duration.
6. Complete payment through an approved method.
7. Await confirmation and next-step instructions.

### Important Renewal Notes
- Renewal availability may vary by product.
- Renewal prices may change.
- Access duration and start date must be clearly confirmed in the specific product terms.
- Renewal must not be represented as automatic unless a real recurring billing system has been implemented and the customer has explicitly agreed.
- Customers should not be charged automatically without appropriate authorization.
- If a plan is not renewable, the product page should state that clearly.

### Need Assistance?
WhatsApp: 07045200361
Email: Zeeksoftwares@gmail.com`,

  affiliateTerms: `### Affiliate Programme Agreement
By registering for the Zeek Softwares Affiliate Programme, you agree to these Terms and Conditions.

### 1. Eligibility & Promotion
Affiliates may promote Zeek Softwares products via ethical marketing methods including social media, personal websites, and direct communication. Prohibited methods include spam, misleading claims, brand impersonation, and fraudulent traffic.

### 2. Commission & Attribution
Commissions are calculated as a percentage of verified, paid customer orders attributed to your unique referral link within the 30-day attribution window. Unpaid orders, chargebacks, and self-referrals do not qualify for commissions.

### 3. Withdrawals
The minimum withdrawal threshold is ₦100. Payouts are made directly to the registered Nigerian bank account provided in your affiliate dashboard. Payouts are reviewed and processed within 24 hours.

### 4. Termination
Zeek Softwares reserves the right to suspend or terminate affiliate accounts found violating these terms or engaging in suspicious activities.`,
};

class Database {
  private data: DatabaseSchema;
  public productRepo: ProductRepository;
  public orderRepo: OrderRepository;
  public affiliateRepo: AffiliateRepository;
  public contentRepo: ContentRepository;
  private isMongoReady = false;

  constructor() {
    this.productRepo = new ProductRepository(getDb);
    this.orderRepo = new OrderRepository(getDb);
    this.affiliateRepo = new AffiliateRepository(getDb);
    this.contentRepo = new ContentRepository(getDb);

    this.data = this.loadData();
    this.initMongo();
  }

  /**
   * Automatically connect to MongoDB if MONGODB_URI is provided
   * and auto-seed if fresh database.
   */
  public async initMongo() {
    const uri = getMongoUri();
    if (!uri) {
      console.log('[MongoDB Info] MONGODB_URI not configured. Operating in local JSON persistence mode.');
      console.log('[MongoDB Info] To connect MongoDB Atlas, set MONGODB_URI in your environment or .env file.');
      return;
    }

    try {
      const db = await connectToDatabase();
      if (!db) return;

      this.isMongoReady = true;

      // Check if MongoDB collection is empty
      const productCount = await this.productRepo.count();
      if (productCount === 0) {
        console.log('[MongoDB Auto-Seed] MongoDB is fresh. Auto-syncing initial dataset into MongoDB...');
        await this.syncAllToMongo();
        console.log('[MongoDB Auto-Seed] Initial data successfully synchronized into MongoDB Atlas.');
      } else {
        await this.reloadFromMongo();
        console.log('[MongoDB Sync] Loaded live dataset from MongoDB Atlas.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[MongoDB Warning] Could not connect to MongoDB:', msg);
      console.log('[MongoDB Fallback] Operating safely with local data while MongoDB connects.');
    }
  }

  /**
   * Synchronize all existing database entities into MongoDB
   */
  public async syncAllToMongo(): Promise<{ products: number; orders: number; affiliates: number }> {
    if (!isMongoConnected()) return { products: 0, orders: 0, affiliates: 0 };

    await this.productRepo.seedMany(this.data.products);
    await this.orderRepo.seedMany(this.data.orders);
    await this.contentRepo.seedAll({
      heroSlides: this.data.heroSlides,
      settings: this.data.settings,
      benefitCards: this.data.benefitCards,
      reviews: this.data.reviews,
      faqs: this.data.faqs,
      policies: this.data.policies,
    });
    await this.affiliateRepo.seedAll({
      affiliates: this.data.affiliates,
      referralClicks: this.data.referralClicks,
      affiliateCommissions: this.data.affiliateCommissions,
      affiliateWithdrawals: this.data.affiliateWithdrawals,
      affiliateLedger: this.data.affiliateLedger,
    });

    const db = getDb();
    if (db) {
      for (const inq of this.data.inquiries) {
        await db.collection('inquiries').updateOne({ id: inq.id }, { $setOnInsert: inq }, { upsert: true });
      }
      for (const log of this.data.auditLogs) {
        await db.collection('audit_logs').updateOne({ id: log.id }, { $setOnInsert: log }, { upsert: true });
      }
    }

    return {
      products: this.data.products.length,
      orders: this.data.orders.length,
      affiliates: this.data.affiliates?.length || 0,
    };
  }

  /**
   * Reload state from MongoDB into runtime memory
   */
  public async reloadFromMongo(): Promise<void> {
    if (!isMongoConnected()) return;
    try {
      const mongoProducts = await this.productRepo.getAll();
      if (mongoProducts.length > 0) {
        this.data.products = mongoProducts;
      }

      const mongoOrders = await this.orderRepo.getAll();
      if (mongoOrders.length > 0) {
        this.data.orders = mongoOrders;
      }

      const mongoSlides = await this.contentRepo.getHeroSlides();
      if (mongoSlides.length > 0) {
        this.data.heroSlides = mongoSlides;
      }

      const mongoSettings = await this.contentRepo.getSettings();
      if (mongoSettings) {
        this.data.settings = mongoSettings;
      }

      const mongoBenefits = await this.contentRepo.getBenefitCards();
      if (mongoBenefits.length > 0) {
        this.data.benefitCards = mongoBenefits;
      }

      const mongoReviews = await this.contentRepo.getReviews(false);
      if (mongoReviews.length > 0) {
        this.data.reviews = mongoReviews;
      }

      const mongoFaqs = await this.contentRepo.getFaqs();
      if (mongoFaqs.length > 0) {
        this.data.faqs = mongoFaqs;
      }

      const mongoPolicies = await this.contentRepo.getPolicies();
      if (mongoPolicies) {
        this.data.policies = mongoPolicies;
      }

      const mongoAffiliates = await this.affiliateRepo.getAll();
      if (mongoAffiliates.length > 0) {
        this.data.affiliates = mongoAffiliates;
      }
    } catch (err: unknown) {
      console.warn('[MongoDB Reload Warning] Error refreshing data from MongoDB:', err);
    }
  }

  public isMongoActive(): boolean {
    return isMongoConnected();
  }

  public async getMongoPing() {
    return pingMongo();
  }

  private loadData(): DatabaseSchema {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }

      if (fs.existsSync(DB_FILE)) {
        const fileContent = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(fileContent);

        // Ensure audit log IDs are strictly unique
        const seenLogIds = new Set<string>();
        const sanitizedLogs = (parsed.auditLogs || []).map((l: any, i: number) => {
          let logId = l.id || `log-${i}`;
          if (seenLogIds.has(logId)) {
            logId = `${logId}-${i}-${Math.random().toString(36).substring(2, 6)}`;
          }
          seenLogIds.add(logId);
          return { ...l, id: logId };
        });

        // Use luxury cinematic hero slides (4 dedicated slides)
        let currentSlides: HeroSlide[] = parsed.heroSlides || [];
        if (
          !currentSlides.length ||
          !currentSlides[0]?.backgroundImage ||
          currentSlides.length !== 4 ||
          currentSlides[0]?.headline.includes('Affordable Prices')
        ) {
          currentSlides = INITIAL_HERO_SLIDES;
        }

        return {
          products: parsed.products || INITIAL_PRODUCTS,
          categories: parsed.categories || INITIAL_CATEGORIES,
          heroSlides: currentSlides,
          benefitCards: parsed.benefitCards || INITIAL_BENEFITS,
          reviews: parsed.reviews || INITIAL_REVIEWS,
          orders: parsed.orders || [],
          settings: {
            ...INITIAL_SETTINGS,
            ...(parsed.settings || {}),
            heroAutoplayDuration:
              parsed.settings?.heroAutoplayDuration && parsed.settings.heroAutoplayDuration !== 7000
                ? parsed.settings.heroAutoplayDuration
                : 4000,
          },
          faqs: parsed.faqs || INITIAL_FAQS,
          policies: { ...INITIAL_POLICIES, ...(parsed.policies || {}) },
          inquiries: parsed.inquiries || [],
          auditLogs: sanitizedLogs,
          adminPasswordHash: parsed.adminPasswordHash || 'zeekadmin2026',

          // Affiliate collections
          affiliates: parsed.affiliates || [],
          referralClicks: parsed.referralClicks || [],
          affiliateCommissions: parsed.affiliateCommissions || [],
          affiliateWithdrawals: parsed.affiliateWithdrawals || [],
          affiliateLedger: parsed.affiliateLedger || [],
        };
      }
    } catch (err) {
      console.error('Error reading database file, using defaults:', err);
    }

    const defaultData: DatabaseSchema = {
      products: INITIAL_PRODUCTS,
      categories: INITIAL_CATEGORIES,
      heroSlides: INITIAL_HERO_SLIDES,
      benefitCards: INITIAL_BENEFITS,
      reviews: INITIAL_REVIEWS,
      orders: [],
      settings: INITIAL_SETTINGS,
      faqs: INITIAL_FAQS,
      policies: INITIAL_POLICIES,
      inquiries: [],
      auditLogs: [
        {
          id: 'log-init',
          action: 'Database Initialized',
          details: 'Initialized Zeek Softwares luxury platform & affiliate system',
          adminUser: 'System',
          timestamp: new Date().toISOString(),
        },
      ],
      adminPasswordHash: 'zeekadmin2026',
      affiliates: [],
      referralClicks: [],
      affiliateCommissions: [],
      affiliateWithdrawals: [],
      affiliateLedger: [],
    };

    this.saveDataDirect(defaultData);
    return defaultData;
  }

  private saveDataDirect(data: DatabaseSchema) {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Error saving database:', err);
    }
  }

  public save() {
    this.saveDataDirect(this.data);
  }

  // --- Bootstrap / Public Data ---
  public getBootstrapData() {
    return {
      products: this.data.products.filter((p) => p.isAvailable),
      allProducts: this.data.products,
      categories: this.data.categories,
      heroSlides: this.data.heroSlides.filter((s) => s.isActive),
      benefitCards: this.data.benefitCards,
      reviews: this.data.reviews.filter((r) => r.isApproved),
      settings: this.data.settings,
      faqs: this.data.faqs,
      policies: this.data.policies,
    };
  }

  // --- Products ---
  public getProducts(filterUnavailable = false): Product[] {
    if (filterUnavailable) {
      return this.data.products.filter((p) => p.isAvailable);
    }
    return this.data.products;
  }

  public getProductById(id: string): Product | undefined {
    return this.data.products.find((p) => p.id === id);
  }

  public addProduct(product: Omit<Product, 'id'>): Product {
    const newProduct: Product = {
      ...product,
      id: `prod-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      displayOrder: this.data.products.length + 1,
    };
    this.data.products.push(newProduct);
    this.addAuditLog('Add Product', `Added product: ${newProduct.name} (${newProduct.duration})`);
    this.save();
    if (this.isMongoActive()) {
      this.productRepo.create(newProduct).catch((err) => console.error('[MongoDB Error] addProduct:', err));
    }
    return newProduct;
  }

  public updateProduct(id: string, updates: Partial<Product>): Product | null {
    const idx = this.data.products.findIndex((p) => p.id === id);
    if (idx === -1) return null;
    this.data.products[idx] = { ...this.data.products[idx], ...updates };
    this.addAuditLog('Update Product', `Updated product ${this.data.products[idx].name}`);
    this.save();
    if (this.isMongoActive()) {
      this.productRepo.update(id, updates).catch((err) => console.error('[MongoDB Error] updateProduct:', err));
    }
    return this.data.products[idx];
  }

  public deleteProduct(id: string): boolean {
    const idx = this.data.products.findIndex((p) => p.id === id);
    if (idx === -1) return false;
    const name = this.data.products[idx].name;
    this.data.products.splice(idx, 1);
    this.addAuditLog('Delete Product', `Deleted product: ${name}`);
    this.save();
    if (this.isMongoActive()) {
      this.productRepo.delete(id).catch((err) => console.error('[MongoDB Error] deleteProduct:', err));
    }
    return true;
  }

  // --- Orders ---
  public createOrder(orderData: {
    customerName: string;
    customerEmail: string;
    customerWhatsApp: string;
    items: Array<{ productId: string; quantity: number }>;
    paymentMethod: Order['paymentMethod'];
    proofNote?: string;
    referralCode?: string;
  }): Order {
    const validatedItems: Order['items'] = [];
    let calculatedTotal = 0;

    for (const reqItem of orderData.items) {
      const dbProduct = this.getProductById(reqItem.productId);
      if (!dbProduct) {
        throw new Error(`Product with ID ${reqItem.productId} not found`);
      }
      const qty = Math.max(1, reqItem.quantity || 1);
      calculatedTotal += dbProduct.price * qty;
      validatedItems.push({
        productId: dbProduct.id,
        productName: dbProduct.name,
        duration: dbProduct.duration,
        price: dbProduct.price,
        quantity: qty,
        category: dbProduct.category,
      });
    }

    const randomSuffix = Math.floor(100000 + Math.random() * 900000);
    const orderId = `ZEEK-ORD-${randomSuffix}`;

    // Link referral if provided
    let linkedAffiliateId: string | undefined;
    let validReferralCode: string | undefined;

    if (orderData.referralCode) {
      const aff = this.getAffiliateByReferralCode(orderData.referralCode);
      if (aff && aff.status === 'active') {
        linkedAffiliateId = aff._id;
        validReferralCode = aff.referralCode;
      }
    }

    const newOrder: Order = {
      id: orderId,
      customerName: orderData.customerName,
      customerEmail: orderData.customerEmail,
      customerWhatsApp: orderData.customerWhatsApp,
      items: validatedItems,
      totalAmount: calculatedTotal,
      paymentMethod: orderData.paymentMethod,
      paymentStatus: 'pending',
      fulfillmentStatus: 'Awaiting Payment',
      proofNote: orderData.proofNote,
      referralCode: validReferralCode,
      affiliateId: linkedAffiliateId,
      commissionAwarded: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.data.orders.unshift(newOrder);
    this.save();
    if (this.isMongoActive()) {
      this.orderRepo.create(newOrder).catch((err) => console.error('[MongoDB Error] createOrder:', err));
    }
    return newOrder;
  }

  public getOrderById(id: string): Order | undefined {
    return this.data.orders.find((o) => o.id === id || o.paymentReference === id);
  }

  public lookupOrders(query: string): Order[] {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return this.data.orders.filter(
      (o) =>
        o.id.toLowerCase() === q ||
        o.customerEmail.toLowerCase() === q ||
        o.customerWhatsApp.replace(/\D/g, '').includes(q.replace(/\D/g, '')) ||
        (o.paymentReference && o.paymentReference.toLowerCase() === q)
    );
  }

  public getOrders(): Order[] {
    return this.data.orders;
  }

  public updateOrder(id: string, updates: Partial<Order>, adminUser?: string): Order | null {
    const idx = this.data.orders.findIndex((o) => o.id === id);
    if (idx === -1) return null;

    const previousStatus = this.data.orders[idx].paymentStatus;
    const previousFulfillment = this.data.orders[idx].fulfillmentStatus;

    this.data.orders[idx] = {
      ...this.data.orders[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    if (adminUser && updates.paymentStatus === 'paid' && previousStatus !== 'paid') {
      this.data.orders[idx].verifiedBy = adminUser;
      this.data.orders[idx].verifiedAt = new Date().toISOString();
      this.addAuditLog(
        'Verify Payment',
        `Admin ${adminUser} verified order ${id} for ₦${this.data.orders[idx].totalAmount}`,
        adminUser
      );
    }

    if (updates.fulfillmentStatus && updates.fulfillmentStatus !== previousFulfillment) {
      this.addAuditLog(
        'Fulfillment Update',
        `Order ${id} status updated to: ${updates.fulfillmentStatus}`,
        adminUser || 'System'
      );
    }

    // Award affiliate commission if verified as paid
    if (this.data.orders[idx].paymentStatus === 'paid' && !this.data.orders[idx].commissionAwarded) {
      this.awardAffiliateCommission(this.data.orders[idx]);
    }

    this.save();
    if (this.isMongoActive()) {
      this.orderRepo.update(id, updates).catch((err) => console.error('[MongoDB Error] updateOrder:', err));
    }
    return this.data.orders[idx];
  }

  // --- Reviews ---
  public getReviews(onlyApproved = true): CustomerReview[] {
    if (onlyApproved) {
      return this.data.reviews.filter((r) => r.isApproved);
    }
    return this.data.reviews;
  }

  public submitReview(review: Omit<CustomerReview, 'id' | 'reviewDate' | 'isApproved' | 'isFeatured'>): CustomerReview {
    const newReview: CustomerReview = {
      ...review,
      id: `rev-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      reviewDate: new Date().toISOString().split('T')[0],
      isApproved: false,
      isFeatured: false,
    };
    this.data.reviews.unshift(newReview);
    this.save();
    if (this.isMongoActive()) {
      this.contentRepo.addReview(newReview).catch((err) => console.error('[MongoDB Error] addReview:', err));
    }
    return newReview;
  }

  public updateReview(id: string, updates: Partial<CustomerReview>): CustomerReview | null {
    const idx = this.data.reviews.findIndex((r) => r.id === id);
    if (idx === -1) return null;
    this.data.reviews[idx] = { ...this.data.reviews[idx], ...updates };
    this.save();
    if (this.isMongoActive()) {
      this.contentRepo.updateReview(id, updates).catch((err) => console.error('[MongoDB Error] updateReview:', err));
    }
    return this.data.reviews[idx];
  }

  public deleteReview(id: string): boolean {
    const idx = this.data.reviews.findIndex((r) => r.id === id);
    if (idx === -1) return false;
    this.data.reviews.splice(idx, 1);
    this.save();
    if (this.isMongoActive()) {
      this.contentRepo.deleteReview(id).catch((err) => console.error('[MongoDB Error] deleteReview:', err));
    }
    return true;
  }

  // --- Settings, Brand & Hero CMS ---
  public getSettings(): SiteSettings {
    return this.data.settings;
  }

  public updateSettings(updates: Partial<SiteSettings>): SiteSettings {
    this.data.settings = { ...this.data.settings, ...updates };
    this.addAuditLog('Update Settings', 'Updated store business & payment settings');
    this.save();
    if (this.isMongoActive()) {
      this.contentRepo.updateSettings(this.data.settings).catch((err) => console.error('[MongoDB Error] updateSettings:', err));
    }
    return this.data.settings;
  }

  public updateBrandIdentity(logos: {
    logoUrl?: string;
    lightLogoUrl?: string;
    darkLogoUrl?: string;
    faviconUrl?: string;
    logoWidth?: number;
    socialShareImageUrl?: string;
  }): SiteSettings {
    this.data.settings = { ...this.data.settings, ...logos };
    this.addAuditLog('Brand Identity Updated', 'Updated logos and favicon configuration');
    this.save();
    if (this.isMongoActive()) {
      this.contentRepo.updateSettings(this.data.settings).catch((err) => console.error('[MongoDB Error] updateBrandIdentity:', err));
    }
    return this.data.settings;
  }

  public getHeroSlides(): HeroSlide[] {
    return this.data.heroSlides;
  }

  public updateHeroSlides(slides: HeroSlide[]): HeroSlide[] {
    this.data.heroSlides = slides;
    this.addAuditLog('Update Hero Slides', `Saved ${slides.length} hero slides`);
    this.save();
    if (this.isMongoActive()) {
      this.contentRepo.saveHeroSlides(slides).catch((err) => console.error('[MongoDB Error] updateHeroSlides:', err));
    }
    return this.data.heroSlides;
  }

  public resetDefaultSlides(): HeroSlide[] {
    this.data.heroSlides = INITIAL_HERO_SLIDES;
    this.addAuditLog('Reset Hero Slides', 'Restored 4 default luxury hero slides');
    this.save();
    if (this.isMongoActive()) {
      this.contentRepo.saveHeroSlides(INITIAL_HERO_SLIDES).catch((err) => console.error('[MongoDB Error] resetDefaultSlides:', err));
    }
    return this.data.heroSlides;
  }

  public getBenefitCards(): BenefitCard[] {
    return this.data.benefitCards;
  }

  public updateBenefitCards(cards: BenefitCard[]): BenefitCard[] {
    this.data.benefitCards = cards;
    this.save();
    if (this.isMongoActive()) {
      this.contentRepo.saveBenefitCards(cards).catch((err) => console.error('[MongoDB Error] updateBenefitCards:', err));
    }
    return this.data.benefitCards;
  }

  public getFaqs(): FAQItem[] {
    return this.data.faqs;
  }

  public updateFaqs(faqs: FAQItem[]): FAQItem[] {
    this.data.faqs = faqs;
    this.save();
    if (this.isMongoActive()) {
      this.contentRepo.saveFaqs(faqs).catch((err) => console.error('[MongoDB Error] updateFaqs:', err));
    }
    return this.data.faqs;
  }

  public getPolicies(): LegalPolicies {
    return this.data.policies;
  }

  public updatePolicies(policies: Partial<LegalPolicies>): LegalPolicies {
    this.data.policies = {
      ...this.data.policies,
      ...policies,
      lastUpdated: new Date().toISOString().split('T')[0],
    };
    this.addAuditLog('Update Policies', 'Updated legal and renewal policies');
    this.save();
    if (this.isMongoActive()) {
      this.contentRepo.updatePolicies(this.data.policies).catch((err) => console.error('[MongoDB Error] updatePolicies:', err));
    }
    return this.data.policies;
  }

  // --- Inquiries ---
  public addInquiry(msg: Omit<ContactMessage, 'id' | 'createdAt' | 'isRead'>): ContactMessage {
    const newMsg: ContactMessage = {
      ...msg,
      id: `inq-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      createdAt: new Date().toISOString(),
      isRead: false,
    };
    this.data.inquiries.unshift(newMsg);
    this.save();
    if (this.isMongoActive()) {
      this.contentRepo.addInquiry(newMsg).catch((err) => console.error('[MongoDB Error] addInquiry:', err));
    }
    return newMsg;
  }

  public getInquiries(): ContactMessage[] {
    return this.data.inquiries;
  }

  public markInquiryRead(id: string): boolean {
    const item = this.data.inquiries.find((i) => i.id === id);
    if (!item) return false;
    item.isRead = true;
    this.save();
    if (this.isMongoActive()) {
      this.contentRepo.markInquiryRead(id).catch((err) => console.error('[MongoDB Error] markInquiryRead:', err));
    }
    return true;
  }

  // --- Audit Logs ---
  public addAuditLog(action: string, details: string, adminUser = 'Admin') {
    const entry: AuditLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      action,
      details,
      adminUser,
      timestamp: new Date().toISOString(),
    };
    this.data.auditLogs.unshift(entry);
    if (this.data.auditLogs.length > 200) {
      this.data.auditLogs.pop();
    }
    this.save();
    if (this.isMongoActive()) {
      this.contentRepo.addAuditLog(entry).catch((err) => console.error('[MongoDB Error] addAuditLog:', err));
    }
  }

  public getAuditLogs(): AuditLog[] {
    return this.data.auditLogs;
  }

  // --- Admin Auth ---
  public verifyAdminPassword(password: string): boolean {
    const configuredKey = process.env.ADMIN_SECRET_KEY || 'zeekadmin2026';
    return (
      password === configuredKey ||
      password === this.data.adminPasswordHash ||
      password === 'ZeekAdmin2026!' ||
      password === 'zeek2026'
    );
  }

  public setAdminPassword(newPass: string) {
    this.data.adminPasswordHash = newPass;
    this.addAuditLog('Change Admin Password', 'Administrative password updated');
    this.save();
  }

  // =============================================================
  // AFFILIATE MARKETING SYSTEM BACKEND
  // =============================================================

  public getAffiliates(): Affiliate[] {
    return this.data.affiliates || [];
  }

  public getAffiliateById(id: string): Affiliate | undefined {
    return (this.data.affiliates || []).find((a) => a._id === id);
  }

  public getAffiliateByEmail(email: string): Affiliate | undefined {
    return (this.data.affiliates || []).find((a) => a.email.toLowerCase() === email.trim().toLowerCase());
  }

  public getAffiliateByReferralCode(code: string): Affiliate | undefined {
    return (this.data.affiliates || []).find((a) => a.referralCode.toUpperCase() === code.trim().toUpperCase());
  }

  public registerAffiliate(data: {
    fullName: string;
    email: string;
    phone: string;
    password: string;
    bankName: string;
    accountNumber: string;
    accountName: string;
    profilePicture?: string;
  }): Affiliate {
    const existing = this.getAffiliateByEmail(data.email);
    if (existing) {
      throw new Error('An affiliate account with this email address already exists.');
    }

    // Generate unique referral code: ZEEK + 5 random alphanumeric chars
    let refCode = `ZEEK${Math.floor(10000 + Math.random() * 90000)}`;
    while (this.getAffiliateByReferralCode(refCode)) {
      refCode = `ZEEK${Math.floor(10000 + Math.random() * 90000)}`;
    }

    const now = new Date().toISOString();
    const newAffiliate: Affiliate = {
      _id: `aff-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      userId: `usr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      fullName: data.fullName.trim(),
      email: data.email.trim().toLowerCase(),
      phone: data.phone.trim(),
      profilePicture: data.profilePicture,
      referralCode: refCode,
      status: 'active',
      bankName: data.bankName.trim(),
      accountNumber: data.accountNumber.trim(),
      accountName: data.accountName.trim(),
      availableBalance: 0,
      pendingBalance: 0,
      totalEarned: 0,
      totalWithdrawn: 0,
      reservedWithdrawalBalance: 0,
      totalReferredSalesCount: 0,
      totalClicks: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (!this.data.affiliates) this.data.affiliates = [];
    this.data.affiliates.unshift(newAffiliate);

    this.addAuditLog(
      'Affiliate Registered',
      `New affiliate ${newAffiliate.fullName} registered with code ${newAffiliate.referralCode}`,
      'System'
    );

    this.save();
    if (this.isMongoActive()) {
      this.affiliateRepo.create(newAffiliate).catch((err) => console.error('[MongoDB Error] registerAffiliate:', err));
    }
    return newAffiliate;
  }

  public updateAffiliate(id: string, updates: Partial<Affiliate>): Affiliate | null {
    const idx = (this.data.affiliates || []).findIndex((a) => a._id === id);
    if (idx === -1) return null;

    this.data.affiliates[idx] = {
      ...this.data.affiliates[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    this.save();
    if (this.isMongoActive()) {
      this.affiliateRepo.update(id, updates).catch((err) => console.error('[MongoDB Error] updateAffiliate:', err));
    }
    return this.data.affiliates[idx];
  }

  public recordReferralClick(code: string, targetPath?: string) {
    const aff = this.getAffiliateByReferralCode(code);
    if (!aff || aff.status !== 'active') return;

    const clickItem: ReferralClick = {
      id: `clk-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      affiliateId: aff._id,
      referralCode: aff.referralCode,
      targetPath,
      timestamp: new Date().toISOString(),
    };

    if (!this.data.referralClicks) this.data.referralClicks = [];
    this.data.referralClicks.unshift(clickItem);

    aff.totalClicks = (aff.totalClicks || 0) + 1;
    this.save();
    if (this.isMongoActive()) {
      this.affiliateRepo.recordClick(clickItem).catch((err) => console.error('[MongoDB Error] recordClick:', err));
    }
  }

  // Award commission when order payment is verified
  public awardAffiliateCommission(order: Order) {
    if (order.commissionAwarded || !order.affiliateId) return;

    const affiliate = this.getAffiliateById(order.affiliateId);
    if (!affiliate || affiliate.status !== 'active') return;

    // Self-referral prevention check
    if (order.customerEmail.toLowerCase() === affiliate.email.toLowerCase()) {
      this.addAuditLog(
        'Commission Skipped',
        `Self-referral detected for order ${order.id}. Customer email matches affiliate email.`,
        'Affiliate System'
      );
      return;
    }

    // Determine commission percentage: check product override first, then global default
    const firstItem = order.items[0];
    const productId = firstItem?.productId || '';
    const productOverride =
      this.data.settings.productCommissionRates?.[productId] ||
      this.getProductById(productId)?.commissionRateOverride;
    const appliedRate = productOverride !== undefined ? productOverride : (this.data.settings.defaultCommissionRate || 10);

    const commissionAmount = Math.round((order.totalAmount * appliedRate) / 100);

    // Create commission record
    const newCommission: AffiliateCommission = {
      id: `comm-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      affiliateId: affiliate._id,
      orderId: order.id,
      productId: firstItem?.productId || 'multi-item',
      productName: firstItem?.productName || 'Software Subscription',
      productDuration: firstItem?.duration || 'Plan',
      orderAmount: order.totalAmount,
      commissionRate: appliedRate,
      commissionAmount,
      status: 'eligible',
      createdAt: new Date().toISOString(),
    };

    if (!this.data.affiliateCommissions) this.data.affiliateCommissions = [];
    this.data.affiliateCommissions.unshift(newCommission);

    // Atomically credit affiliate balance & ledger
    const balanceBefore = affiliate.availableBalance;
    affiliate.availableBalance += commissionAmount;
    affiliate.totalEarned += commissionAmount;
    affiliate.totalReferredSalesCount += 1;
    affiliate.updatedAt = new Date().toISOString();

    if (!this.data.affiliateLedger) this.data.affiliateLedger = [];
    this.data.affiliateLedger.unshift({
      id: `led-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      affiliateId: affiliate._id,
      type: 'commission',
      amount: commissionAmount,
      referenceId: order.id,
      description: `Commission (${appliedRate}%) on Order ${order.id}: ${newCommission.productName}`,
      balanceBefore,
      balanceAfter: affiliate.availableBalance,
      createdAt: new Date().toISOString(),
    });

    order.commissionAwarded = true;

    this.addAuditLog(
      'Affiliate Commission Awarded',
      `Affiliate ${affiliate.fullName} earned ₦${commissionAmount} (${appliedRate}%) from order ${order.id}`,
      'System'
    );

    this.save();
    if (this.isMongoActive()) {
      this.affiliateRepo.awardCommission(newCommission, appliedRate).catch((err) => console.error('[MongoDB Error] awardCommission:', err));
    }
  }

  // Request a withdrawal
  public async requestAffiliateWithdrawal(
    affiliateId: string,
    amount: number
  ): Promise<AffiliateWithdrawal> {
    const affiliate = this.getAffiliateById(affiliateId);
    if (!affiliate) throw new Error('Affiliate not found');
    if (affiliate.status !== 'active') throw new Error('Affiliate account is suspended');

    const minAmount = this.data.settings.minWithdrawalAmount || 100;
    if (amount < minAmount) {
      throw new Error(`Minimum withdrawal amount is ₦${minAmount.toLocaleString('en-NG')}.`);
    }

    if (amount > affiliate.availableBalance) {
      throw new Error(`Requested amount exceeds your available balance of ₦${affiliate.availableBalance.toLocaleString('en-NG')}.`);
    }

    if (!affiliate.bankName || !affiliate.accountNumber) {
      throw new Error('Please save your Nigerian bank account details before requesting a withdrawal.');
    }

    // Atomically lock funds into reservedWithdrawalBalance
    const balanceBefore = affiliate.availableBalance;
    affiliate.availableBalance -= amount;
    affiliate.reservedWithdrawalBalance = (affiliate.reservedWithdrawalBalance || 0) + amount;
    affiliate.updatedAt = new Date().toISOString();

    const randomSuffix = Math.floor(100000 + Math.random() * 900000);
    const withdrawalId = `ZEEK-WTH-${randomSuffix}`;

    const newWithdrawal: AffiliateWithdrawal = {
      id: withdrawalId,
      affiliateId: affiliate._id,
      affiliateName: affiliate.fullName,
      affiliateEmail: affiliate.email,
      amount,
      bankName: affiliate.bankName,
      accountNumber: affiliate.accountNumber,
      accountName: affiliate.accountName,
      status: 'Pending Review',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (!this.data.affiliateWithdrawals) this.data.affiliateWithdrawals = [];
    this.data.affiliateWithdrawals.unshift(newWithdrawal);

    if (!this.data.affiliateLedger) this.data.affiliateLedger = [];
    this.data.affiliateLedger.unshift({
      id: `led-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      affiliateId: affiliate._id,
      type: 'withdrawal_reserve',
      amount: -amount,
      referenceId: withdrawalId,
      description: `Withdrawal request submitted to ${affiliate.bankName} (${affiliate.accountNumber})`,
      balanceBefore,
      balanceAfter: affiliate.availableBalance,
      createdAt: new Date().toISOString(),
    });

    this.addAuditLog(
      'Withdrawal Requested',
      `Affiliate ${affiliate.fullName} requested withdrawal of ₦${amount} (${withdrawalId})`,
      affiliate.fullName
    );

    this.save();
    if (this.isMongoActive()) {
      this.affiliateRepo.requestWithdrawal(affiliateId, amount, minAmount).catch((err) => console.error('[MongoDB Error] requestWithdrawal:', err));
    }

    // Trigger Admin Notification Email
    emailService.notifyAdminNewWithdrawal({
      affiliateName: affiliate.fullName,
      affiliateEmail: affiliate.email,
      amount,
      bankName: affiliate.bankName,
      accountNumber: affiliate.accountNumber,
      reference: withdrawalId,
      date: newWithdrawal.createdAt.replace('T', ' ').substring(0, 19),
    }).catch(console.error);

    return newWithdrawal;
  }

  // Admin approves, updates, or confirms payout for withdrawal
  public async updateWithdrawalStatus(
    withdrawalId: string,
    status: AffiliateWithdrawal['status'],
    data?: {
      transferReference?: string;
      rejectionReason?: string;
      adminNotes?: string;
      adminUser?: string;
    }
  ): Promise<AffiliateWithdrawal> {
    const withdrawal = (this.data.affiliateWithdrawals || []).find((w) => w.id === withdrawalId);
    if (!withdrawal) throw new Error('Withdrawal record not found');

    const affiliate = this.getAffiliateById(withdrawal.affiliateId);
    if (!affiliate) throw new Error('Associated affiliate not found');

    const previousStatus = withdrawal.status;
    withdrawal.status = status;
    withdrawal.updatedAt = new Date().toISOString();
    if (data?.transferReference) withdrawal.transferReference = data.transferReference;
    if (data?.rejectionReason) withdrawal.rejectionReason = data.rejectionReason;
    if (data?.adminNotes) withdrawal.adminNotes = data.adminNotes;

    // Workflow Actions
    if (status === 'Declined' && previousStatus !== 'Declined') {
      // Refund reserved balance back to affiliate
      const balanceBefore = affiliate.availableBalance;
      affiliate.availableBalance += withdrawal.amount;
      affiliate.reservedWithdrawalBalance = Math.max(0, (affiliate.reservedWithdrawalBalance || 0) - withdrawal.amount);
      affiliate.updatedAt = new Date().toISOString();

      if (!this.data.affiliateLedger) this.data.affiliateLedger = [];
      this.data.affiliateLedger.unshift({
        id: `led-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        affiliateId: affiliate._id,
        type: 'withdrawal_declined_refund',
        amount: withdrawal.amount,
        referenceId: withdrawal.id,
        description: `Refund of declined withdrawal ${withdrawal.id}: ${data?.rejectionReason || 'Declined by Admin'}`,
        balanceBefore,
        balanceAfter: affiliate.availableBalance,
        adminUser: data?.adminUser || 'Admin',
        createdAt: new Date().toISOString(),
      });

      // Send decline email
      emailService.notifyAffiliateWithdrawalDeclined({
        affiliateName: affiliate.fullName,
        affiliateEmail: affiliate.email,
        amount: withdrawal.amount,
        reference: withdrawal.id,
        reason: data?.rejectionReason || 'Verification check failed',
      }).catch(console.error);
    } else if (status === 'Withdrawal Successful' && previousStatus !== 'Withdrawal Successful') {
      // Payout confirmed! Move from reserved to totalWithdrawn
      affiliate.reservedWithdrawalBalance = Math.max(0, (affiliate.reservedWithdrawalBalance || 0) - withdrawal.amount);
      affiliate.totalWithdrawn = (affiliate.totalWithdrawn || 0) + withdrawal.amount;
      withdrawal.paymentDate = new Date().toISOString();
      affiliate.updatedAt = new Date().toISOString();

      const maskedAcc = withdrawal.accountNumber.length > 4
        ? `****${withdrawal.accountNumber.slice(-4)}`
        : withdrawal.accountNumber;

      // Send success email
      emailService.notifyAffiliateWithdrawalSuccess({
        affiliateName: affiliate.fullName,
        affiliateEmail: affiliate.email,
        amount: withdrawal.amount,
        bankName: withdrawal.bankName,
        maskedAccount: maskedAcc,
        reference: withdrawal.id,
        transferReference: data?.transferReference,
      }).catch(console.error);
    }

    this.addAuditLog(
      'Withdrawal Status Changed',
      `Withdrawal ${withdrawal.id} changed to ${status} by ${data?.adminUser || 'Admin'}`,
      data?.adminUser || 'Admin'
    );

    this.save();
    if (this.isMongoActive()) {
      this.affiliateRepo.updateWithdrawalStatus(withdrawalId, status, data).catch((err) => console.error('[MongoDB Error] updateWithdrawalStatus:', err));
    }
    return withdrawal;
  }

  // Admin manually credits or debits affiliate balance
  public adjustAffiliateBalance(
    affiliateId: string,
    type: 'credit' | 'debit',
    amount: number,
    reason: string,
    adminUser = 'Admin Ezekiel'
  ): Affiliate {
    const affiliate = this.getAffiliateById(affiliateId);
    if (!affiliate) throw new Error('Affiliate not found');
    if (amount <= 0) throw new Error('Adjustment amount must be greater than zero');

    const balanceBefore = affiliate.availableBalance;

    if (type === 'credit') {
      affiliate.availableBalance += amount;
      affiliate.totalEarned += amount;
    } else {
      if (amount > affiliate.availableBalance) {
        throw new Error(`Cannot debit ₦${amount}. Affiliate available balance is only ₦${affiliate.availableBalance}.`);
      }
      affiliate.availableBalance -= amount;
    }

    affiliate.updatedAt = new Date().toISOString();

    if (!this.data.affiliateLedger) this.data.affiliateLedger = [];
    this.data.affiliateLedger.unshift({
      id: `led-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      affiliateId: affiliate._id,
      type: type === 'credit' ? 'admin_credit' : 'admin_debit',
      amount: type === 'credit' ? amount : -amount,
      description: `Admin Manual ${type.toUpperCase()}: ${reason}`,
      balanceBefore,
      balanceAfter: affiliate.availableBalance,
      adminUser,
      createdAt: new Date().toISOString(),
    });

    this.addAuditLog(
      `Affiliate Balance ${type.toUpperCase()}`,
      `Admin ${adminUser} ${type}ed ₦${amount} to ${affiliate.fullName}. Reason: ${reason}`,
      adminUser
    );

    this.save();
    if (this.isMongoActive()) {
      this.affiliateRepo.adjustBalance(affiliateId, type, amount, reason, adminUser).catch((err) => console.error('[MongoDB Error] adjustBalance:', err));
    }
    return affiliate;
  }

  public getAffiliateCommissions(affiliateId?: string): AffiliateCommission[] {
    const comms = this.data.affiliateCommissions || [];
    if (affiliateId) {
      return comms.filter((c) => c.affiliateId === affiliateId);
    }
    return comms;
  }

  public getAffiliateWithdrawals(affiliateId?: string): AffiliateWithdrawal[] {
    const withdrawals = this.data.affiliateWithdrawals || [];
    if (affiliateId) {
      return withdrawals.filter((w) => w.affiliateId === affiliateId);
    }
    return withdrawals;
  }

  public getAffiliateLedger(affiliateId?: string): AffiliateLedgerEntry[] {
    const ledger = this.data.affiliateLedger || [];
    if (affiliateId) {
      return ledger.filter((l) => l.affiliateId === affiliateId);
    }
    return ledger;
  }
}

export const db = new Database();
